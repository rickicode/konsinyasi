import { errorCodes, type ErrorCode } from '@shared/lib/error-codes.js';

export type ApiErrorCode = ErrorCode;

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  endpoint?: string;

  constructor(status: number, code: ApiErrorCode, message: string, endpoint?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
    this.name = 'ApiError';
  }
}

export const errorMessages: Record<ApiErrorCode, string> = errorCodes;

export function getErrorMessage(code: ApiErrorCode, fallback?: string): string {
  return fallback ?? errorMessages[code] ?? errorMessages.INTERNAL_ERROR;
}
