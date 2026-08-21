/**
 * logger.ts — one-line JSON logs for server code.
 *
 * Vercel's log drain treats each stdout line as an opaque string, so
 * `console.error('Order ' + id + ' failed:', err)` can only ever be searched
 * with a substring match — you cannot filter to "every auth failure" or alert
 * on one event without also matching prose that happens to contain the word.
 * Emitting a single JSON object per line makes the level, the event name and
 * the context queryable fields instead.
 *
 * Deliberately dependency-free: this replaces scattered console calls, and
 * pulling pino into a serverless bundle for structured *output* alone would
 * cost more than it returns here.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

/** Keys whose values must never reach a log line, at any nesting depth. */
const REDACTED_KEYS = /^(password|token|access_token|refresh_token|authorization|secret|key_secret|signature|apikey|api_key)$/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACTED_KEYS.test(k) ? '[redacted]' : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, event: string, context?: LogContext) {
  const line = {
    level,
    event,
    at: new Date().toISOString(),
    ...(context ? (scrub(context) as LogContext) : {}),
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(line);
  } catch {
    // A circular value slipped past `scrub` — never let logging throw.
    serialized = JSON.stringify({ level, event, at: line.at, note: 'context not serializable' });
  }

  if (level === 'error') console.error(serialized);
  else if (level === 'warn') console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (event: string, context?: LogContext) => emit('debug', event, context),
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
};
