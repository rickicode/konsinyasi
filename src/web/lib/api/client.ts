import type { ZodType, ZodTypeDef } from 'zod';
import { ApiError, errorMessages, getErrorMessage, type ApiErrorCode } from './errors.js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiClientOptions {
	baseUrl?: string;
	defaultHeaders?: Record<string, string>;
}

function buildUrl(base: string, path: string): string {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	const baseEnd = base.endsWith('/') ? base.slice(0, -1) : base;
	const pathStart = path.startsWith('/') ? path : `/${path}`;
	return `${baseEnd}${pathStart}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !(value instanceof FormData) && !Array.isArray(value);
}

export class ApiClient {
	private baseUrl: string;
	private defaultHeaders: Record<string, string>;

	constructor(options: ApiClientOptions = {}) {
		this.baseUrl = options.baseUrl ?? '';
		this.defaultHeaders = options.defaultHeaders ?? {};
	}

	private async requestJson<T>(
		method: HttpMethod,
		path: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		body?: unknown,
		init?: RequestInit,
	): Promise<T> {
		const url = buildUrl(this.baseUrl, path);

		const headers = new Headers(init?.headers);
		Object.entries(this.defaultHeaders).forEach(([key, value]) => {
			if (!headers.has(key)) headers.set(key, value);
		});

		if (body !== undefined && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}

		const requestInit: RequestInit = {
			...init,
			method,
			headers,
			credentials: init?.credentials ?? 'include',
			body: body instanceof FormData || body instanceof URLSearchParams ? body : isPlainObject(body) ? JSON.stringify(body) : (body as BodyInit | undefined),
		};

		let response: Response;
		try {
			response = await fetch(url, requestInit);
		} catch {
			throw new ApiError(0, 'NETWORK_ERROR', getErrorMessage('NETWORK_ERROR'), path);
		}

		if (!response.ok) {
			let code: ApiErrorCode = 'INTERNAL_ERROR';
			let message = response.statusText || errorMessages.INTERNAL_ERROR;
			try {
				const payload = (await response.json()) as { code?: string; message?: string };
				if (payload.code && isErrorCode(payload.code)) code = payload.code;
				if (payload.message) message = payload.message;
			} catch {
				message = response.statusText || errorMessages.INTERNAL_ERROR;
			}
			throw new ApiError(response.status, code, message, path);
		}

		if (response.status === 204) {
			return schema.parse(undefined) as T;
		}

		let data: unknown;
		try {
			data = await response.json();
		} catch {
			throw new ApiError(response.status, 'PARSE_ERROR', getErrorMessage('PARSE_ERROR'), path);
		}

		const parsed = schema.safeParse(data);
		if (!parsed.success) {
			throw new ApiError(response.status, 'PARSE_ERROR', `Format respons tidak valid: ${parsed.error.errors[0]?.message ?? 'unknown'}`, path);
		}
		return parsed.data;
	}

	async get<T>(path: string, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
		return this.requestJson('GET', path, schema, undefined, init);
	}

	async post<T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
		return this.requestJson('POST', path, schema, body, init);
	}

	async patch<T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
		return this.requestJson('PATCH', path, schema, body, init);
	}

	async put<T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
		return this.requestJson('PUT', path, schema, body, init);
	}

	async delete<T>(path: string, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
		return this.requestJson('DELETE', path, schema, undefined, init);
	}

	async requestRaw(method: HttpMethod, path: string, body?: unknown, init?: RequestInit): Promise<Response> {
		const url = buildUrl(this.baseUrl, path);

		const headers = new Headers(init?.headers);
		Object.entries(this.defaultHeaders).forEach(([key, value]) => {
			if (!headers.has(key)) headers.set(key, value);
		});

		if (body !== undefined && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}

		const requestInit: RequestInit = {
			...init,
			method,
			headers,
			credentials: init?.credentials ?? 'include',
			body: body instanceof FormData || body instanceof URLSearchParams ? body : isPlainObject(body) ? JSON.stringify(body) : (body as BodyInit | undefined),
		};

		try {
			return await fetch(url, requestInit);
		} catch {
			throw new ApiError(0, 'NETWORK_ERROR', getErrorMessage('NETWORK_ERROR'), path);
		}
	}
}

function isErrorCode(value: string): value is ApiErrorCode {
	return value in errorMessages;
}

export const apiClient = new ApiClient();
