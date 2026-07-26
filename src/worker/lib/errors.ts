import { errorCodes, type ErrorCode } from '@shared/lib/error-codes.js';

export class AppError extends Error {
  status: number;
  code: ErrorCode;

  constructor(status: number, code: ErrorCode, message?: string) {
    super(message ?? errorCodes[code]);
    this.status = status;
    this.code = code;
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = errorCodes.AUTH_REQUIRED) {
    super(401, 'AUTH_REQUIRED', message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = errorCodes.FORBIDDEN) {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = errorCodes.VALIDATION_ERROR) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = errorCodes.CONFLICT) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class GeofenceError extends AppError {
  constructor(message: string = errorCodes.GEOFENCE_ERROR) {
    super(400, 'GEOFENCE_ERROR', message);
    this.name = 'GeofenceError';
  }
}
