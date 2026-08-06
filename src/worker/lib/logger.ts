/**
 * Structured JSON logger for Cloudflare Workers.
 *
 * Emits one JSON object per line so logs can be aggregated and queried
 * (Workers Logs, Logpush, or any JSON-log ingestion pipeline). Never includes
 * request bodies or sensitive payloads — only metadata explicitly passed in.
 *
 * Supports scoped context via `logger.withContext()` for request-level metadata
 * (requestId, userId, route) that is automatically attached to every log entry.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Request-scoped context automatically merged into log entries. */
export interface LogContext {
  /** Unique request identifier (from cf-ray or generated UUID). */
  requestId?: string;
  /** Authenticated user ID. */
  userId?: string;
  /** Request route pattern (e.g. GET /api/visits). */
  route?: string;
  /** HTTP method. */
  method?: string;
  /** Request URL path. */
  path?: string;
  /** Client IP address. */
  clientIp?: string;
  /** Cloudflare Ray ID. */
  cfRay?: string;
  /** Additional key-value pairs. */
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  /** Millisecond epoch timestamp. */
  ts: number;
  /** ISO-8601 timestamp (human-readable). */
  time: string;
  message: string;
  /** Request-scoped context (requestId, userId, route, etc.). */
  request?: LogContext;
  /** Optional structured context (error code, custom fields, etc.). */
  context?: Record<string, unknown>;
  /** Error stack trace. Captured automatically for error level. */
  stack?: string;
  /** Error name (e.g. TypeError, AppError). */
  errorName?: string;
}

/**
 * Extract a stack trace from context. Automatically captures for errors;
 * for other levels only captures when the caller explicitly opts in.
 */
function extractStack(
  level: LogLevel,
  context?: Record<string, unknown>,
  includeStack?: boolean,
): { stack?: string; errorName?: string } {
  const err =
    context && typeof context.error === 'object' && context.error instanceof Error
      ? context.error
      : undefined;

  // Always capture stack for error-level logs; other levels need explicit opt-in.
  if (err && (level === 'error' || includeStack)) {
    return { stack: err.stack, errorName: err.name };
  }
  return {};
}

function write(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  requestContext?: LogContext,
  includeStack = false,
): void {
  const { stack, errorName } = extractStack(level, context, includeStack);

  const entry: LogEntry = {
    level,
    ts: Date.now(),
    time: new Date().toISOString(),
    message,
    ...(requestContext && Object.keys(requestContext).length > 0 ? { request: requestContext } : {}),
    ...(context ? { context } : {}),
    ...(stack ? { stack } : {}),
    ...(errorName ? { errorName } : {}),
  };

  const line = JSON.stringify(entry);
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.log(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

/**
 * Create a child logger with pre-bound request context.
 * All subsequent log calls will include the bound context automatically.
 *
 * @example
 * ```ts
 * const reqLogger = logger.withContext({ requestId: 'abc', userId: '123', route: 'GET /api/visits' });
 * reqLogger.info('processing request');
 * reqLogger.error('something failed', { error: someError });
 * ```
 */
function withContext(ctx: LogContext) {
  return {
    debug(message: string, context?: Record<string, unknown>): void {
      write('debug', message, context, ctx);
    },
    info(message: string, context?: Record<string, unknown>): void {
      write('info', message, context, ctx);
    },
    warn(message: string, context?: Record<string, unknown>): void {
      write('warn', message, context, ctx);
    },
    error(message: string, context?: Record<string, unknown>): void {
      write('error', message, context, ctx);
    },
  };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    write('debug', message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    write('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    write('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    write('error', message, context);
  },
  /** Create a scoped child logger with pre-bound request context. */
  withContext,
};
