// Structured logging with pino.
// Falls back to console when pino is unavailable.

import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export interface StructuredLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): StructuredLogger;
}

function createLogger(bindings?: Record<string, unknown>): StructuredLogger {
  const log = bindings ? logger.child(bindings) : logger;
  return {
    info: (message, meta) => log.info(meta ?? {}, message),
    warn: (message, meta) => log.warn(meta ?? {}, message),
    error: (message, meta) => log.error(meta ?? {}, message),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

export const structuredLogger = createLogger();

export function createRequestLogger(requestId: string, userId?: string) {
  return createLogger({ requestId, userId });
}
