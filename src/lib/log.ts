/**
 * Logger estructurado (JSON por línea). Nunca imprime secretos: cualquier clave cuyo
 * nombre parezca sensible se reemplaza por [oculto], y los errores se reducen a
 * nombre, mensaje, código y primeras líneas de la pila (sin parámetros de consultas SQL).
 */
type Level = 'info' | 'warn' | 'error';

const SENSIBLE = /pass|secret|token|authorization|cookie|database_url|hash|foto|credential/i;
const MAX_DEPTH = 4;
const MAX_STRING = 500;

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + '…' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return serializeError(value);
  if (depth >= MAX_DEPTH) return '[profundo]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      out[k] = SENSIBLE.test(k) ? '[oculto]' : sanitize(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function serializeError(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) return { message: String(err).slice(0, MAX_STRING) };
  const anyErr = err as Error & { code?: string; constraint?: string; table?: string };
  return {
    name: err.name,
    message: err.message.slice(0, MAX_STRING),
    code: anyErr.code,
    constraint: anyErr.constraint,
    table: anyErr.table,
    stack: err.stack?.split('\n').slice(0, 4).join(' | '),
  };
}

function write(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(sanitize(data ?? {}) as object) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};
