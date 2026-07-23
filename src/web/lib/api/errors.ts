export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'GEOFENCE_ERROR'
  | 'NOT_FOUND'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR';

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

export const errorMessages: Record<ApiErrorCode, string> = {
  AUTH_REQUIRED: 'Sesi habis. Silakan login kembali.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk melakukan ini.',
  VALIDATION_ERROR: 'Data tidak valid. Periksa kembali isian Anda.',
  CONFLICT: 'Data sudah ada atau sedang diproses. Silakan coba lagi.',
  GEOFENCE_ERROR: 'Lokasi di luar radius warung yang diizinkan.',
  NOT_FOUND: 'Data tidak ditemukan.',
  CONFIG_ERROR: 'Terjadi kesalahan konfigurasi server.',
  INTERNAL_ERROR: 'Terjadi kesalahan server. Silakan coba lagi nanti.',
  NETWORK_ERROR: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  PARSE_ERROR: 'Gagal membaca respons server.',
};

export function getErrorMessage(code: ApiErrorCode, fallback?: string): string {
  return fallback ?? errorMessages[code] ?? errorMessages.INTERNAL_ERROR;
}
