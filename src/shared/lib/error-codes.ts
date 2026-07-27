/**
 * Single source of truth for API/user-facing error codes and their
 * Indonesian default messages.
 */
export const errorCodes = {
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
  UPLOAD_ERROR: 'Gagal mengunggah file.',
RATE_LIMITED: 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
} as const;

export type ErrorCode = keyof typeof errorCodes;
