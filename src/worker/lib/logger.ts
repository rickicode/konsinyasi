/**
 * Structured JSON logger for Cloudflare Workers.
 *
 * Emits one JSON object per line so logs can be aggregated and queried
 * (Workers Logs, Logpush, or any JSON-log ingestion pipeline). Never includes
 * request bodies or sensitive payloads — only metadata explicitly passed in.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  /** Millisecond epoch timestamp. */
  ts: number;
  /** ISO-8601 timestamp (human-readable). */
  time: string;
  message: string;
  /** Optional structured context (error code, request id, route, etc.). */
  context?: Record<string, unknown>;
  /** Error stack trace. Only populated when explicitly requested (debug). */
  stack?: string;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>, includeStack = false): void {
  const entry: LogEntry = {
    level,
    ts: Date.now(),
    time: new Date().toISOString(),
    message,
    ...(context ? { context } : {}),
  };

  // Never log stack traces unless a caller explicitly opts in (debug mode).
  if (includeStack && context && typeof context.error === 'object' && context.error instanceof Error) {
    entry.stack = (context.error as Error).stack;
  }

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
};
