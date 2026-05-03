/**
 * A lightweight structured logger simulating a production-grade
 * logging & error tracking system (like Sentry or Datadog).
 */

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const payload = {
    timestamp,
    level,
    message,
    ...context
  };
  return JSON.stringify(payload);
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(formatLog("info", message, context));
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(formatLog("warn", message, context));
  },
  error: (error: Error | string, context?: LogContext) => {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(formatLog("error", message, { ...context, stack }));
    // In a real application, you would send this to Sentry:
    // Sentry.captureException(error, { extra: context });
  }
};
