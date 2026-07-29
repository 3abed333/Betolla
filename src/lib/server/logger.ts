import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const SENSITIVE_KEY = /authorization|cookie|email|password|phone|secret|session|token|address/i;
const MAX_STRING_LENGTH = 500;

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, key, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        sanitize(childValue, childKey, depth + 1),
      ]),
    );
  }
  return String(value);
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const safeContext = sanitize(context) as Record<string, unknown>;
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "betolla-web",
    event,
    ...safeContext,
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export function logInfo(event: string, context?: LogContext) {
  write("info", event, context);
}

export function logWarn(event: string, context?: LogContext) {
  write("warn", event, context);
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  const details =
    error instanceof Error
      ? {
          errorName: error.name,
          ...(process.env.NODE_ENV === "production" ? {} : { errorMessage: error.message }),
        }
      : { errorName: "UnknownError" };
  write("error", event, { ...context, ...details });
}
