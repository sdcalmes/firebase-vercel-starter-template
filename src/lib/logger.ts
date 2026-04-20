/** Safely extract an error message without leaking stack traces or internal details. */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

function formatLog(entry: LogEntry): string {
  if (isProduction) return JSON.stringify(entry);
  const { level, message, timestamp, ...rest } = entry;
  const extras = Object.keys(rest).length ? " " + JSON.stringify(rest) : "";
  return `[${timestamp}] ${level.toUpperCase()} ${message}${extras}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const output = formatLog(entry);
  switch (level) {
    case "error": console.error(output); break;
    case "warn": console.warn(output); break;
    default: console.log(output);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
