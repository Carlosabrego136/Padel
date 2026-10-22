import { Pool, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { getDbEnv } from './env';
import { log, serializeError } from './log';

/**
 * Acceso a PostgreSQL (Aiven).
 *  - Pool singleton por instancia (se reutiliza entre invocaciones serverless).
 *  - Todo tiene tiempo límite: conexión 8 s, sentencia 12 s, consulta 15 s, bloqueo 5 s.
 *  - Reintentos SIEMPRE acotados (máx. 3) y solo para errores transitorios/serialización.
 *  - Las escrituras viven dentro de withTx(): un actor obligatorio queda registrado en la
 *    sesión (app.actor) para que los triggers de auditoría sepan quién modificó qué.
 */

declare global {
  // eslint-disable-next-line no-var
  var __padelPool: Pool | undefined;
}

const MAX_RETRIES_HARD_LIMIT = 3;
const TRANSIENT_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND',
  '57P01', '57P02', '57P03', '08000', '08003', '08006', '53300',
]);
const TX_RETRY_CODES = new Set(['40001', '40P01']);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const codeOf = (err: unknown): string | undefined => (err as { code?: string } | null)?.code;
const isTransient = (err: unknown) => {
  const c = codeOf(err);
  return !!c && TRANSIENT_CODES.has(c);
};

function buildConfig(): PoolConfig {
  const { DATABASE_URL, DATABASE_CA } = getDbEnv();
  const url = new URL(DATABASE_URL.replace(/^postgresql:/i, 'postgres:'));
  const sslmode = url.searchParams.get('sslmode');
  // pg trata sslmode=require como verify-full y pisaría nuestra configuración TLS: lo quitamos y lo manejamos aquí.
  url.searchParams.delete('sslmode');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  let ssl: PoolConfig['ssl'];
  if (sslmode === 'disable' || (isLocal && !sslmode)) {
    ssl = false;
  } else if (DATABASE_CA && DATABASE_CA.trim()) {
    ssl = { ca: DATABASE_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  } else {
    log.warn('db_tls_sin_ca', { aviso: 'Define DATABASE_CA para verificar el certificado del servidor' });
    ssl = { rejectUnauthorized: false };
  }

  return {
    connectionString: url.toString(),
    ssl,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 12_000,
    query_timeout: 15_000,
    idle_in_transaction_session_timeout: 20_000,
    application_name: 'padel-life-ranking',
  };
}

export function getPool(): Pool {
  if (!globalThis.__padelPool) {
    const pool = new Pool(buildConfig());
    pool.on('error', (err) => log.error('db_pool_error', { error: serializeError(err) }));
    globalThis.__padelPool = pool;
  }
  return globalThis.__padelPool;
}

export async function closePool(): Promise<void> {
  const pool = globalThis.__padelPool;
  globalThis.__padelPool = undefined;
  if (pool) await pool.end();
}

/** Consulta de SOLO LECTURA (o escritura idempotente) con reintentos acotados ante cortes de conexión. */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
  opts: { maxRetries?: number } = {},
): Promise<QueryResult<R>> {
  const maxRetries = Math.min(Math.max(opts.maxRetries ?? 2, 0), MAX_RETRIES_HARD_LIMIT);
  for (let attempt = 0; ; attempt++) {
    try {
      return await getPool().query<R>(text, params as any[]);
    } catch (err) {
      if (attempt < maxRetries && isTransient(err)) {
        log.warn('db_query_reintento', { intento: attempt + 1, error: serializeError(err) });
        await sleep(150 * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Transacciones con actor y auditoría
// ---------------------------------------------------------------------------

export interface Actor {
  /** UUID del administrador, o null para el sistema/público. */
  id: string | null;
  /** Texto legible que se guarda como autor (correo, 'sistema:cron', 'publico'…). */
  label: string;
  ip?: string | null;
}

export interface AuditEntry {
  accion: string;
  entidad: string;
  entidadId?: string | null;
  antes?: unknown;
  despues?: unknown;
  detalle?: string;
}

export interface Tx {
  query<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  /** Registra en audit_log: quién (actor), cuándo (now) y qué dato cambió (antes/después). */
  audit(entry: AuditEntry): Promise<void>;
  readonly actor: Actor;
  readonly auditCount: number;
}

const SENSIBLE_AUDIT = /foto|pass|hash|secret|token/i;

function limpiarParaAuditoria(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (depth > 5) return '[profundo]';
  if (Array.isArray(value)) return value.slice(0, 500).map((v) => limpiarParaAuditoria(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSIBLE_AUDIT.test(k) ? '[oculto]' : limpiarParaAuditoria(v, depth + 1);
  }
  return out;
}

const cleanLabel = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120) || 'desconocido';

function makeTx(client: PoolClient, actor: Actor): Tx {
  let count = 0;
  return {
    actor,
    get auditCount() {
      return count;
    },
    query: (text, params = []) => client.query(text, params as any[]),
    async audit(entry) {
      await client.query(
        `INSERT INTO audit_log (actor_id, actor, accion, entidad, entidad_id, antes, despues, detalle, ip)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`,
        [
          actor.id,
          cleanLabel(actor.label),
          entry.accion,
          entry.entidad,
          entry.entidadId ?? null,
          JSON.stringify(limpiarParaAuditoria(entry.antes)),
          JSON.stringify(limpiarParaAuditoria(entry.despues)),
          entry.detalle?.slice(0, 500) ?? null,
          actor.ip ?? null,
        ],
      );
      count++;
    },
  };
}

export interface TxOptions {
  /** Reintentos ante deadlock/serialización (tope duro: 3). */
  maxRetries?: number;
  /** Si es true, la transacción se revierte si no registró al menos una entrada de auditoría. */
  requireAudit?: boolean;
}

export async function withTx<T>(actor: Actor, fn: (tx: Tx) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  const maxRetries = Math.min(Math.max(opts.maxRetries ?? 3, 0), MAX_RETRIES_HARD_LIMIT);

  for (let attempt = 0; ; attempt++) {
    const client = await getPool().connect();
    let broken = false;
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.actor', $1, true)", [cleanLabel(actor.label)]);
      await client.query("SET LOCAL lock_timeout = '5s'");
      const tx = makeTx(client, actor);
      const result = await fn(tx);
      if (opts.requireAudit && tx.auditCount === 0) {
        throw new Error('Operación administrativa sin registro de auditoría: se revierte');
      }
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        broken = true; // la conexión quedó en mal estado: se descarta del pool
        log.error('db_rollback_fallo', { error: serializeError(rollbackErr) });
      }
      const c = codeOf(err);
      if (attempt < maxRetries && c && TX_RETRY_CODES.has(c)) {
        log.warn('db_tx_reintento', { intento: attempt + 1, codigo: c });
        await sleep(100 * 2 ** attempt + Math.floor(Math.random() * 50));
        continue;
      }
      throw err;
    } finally {
      client.release(broken ? true : undefined);
    }
  }
}

/** Transacción de administrador: la auditoría es OBLIGATORIA (se revierte si falta). */
export const withAdminTx = <T>(actor: Actor, fn: (tx: Tx) => Promise<T>, opts: Omit<TxOptions, 'requireAudit'> = {}) =>
  withTx(actor, fn, { ...opts, requireAudit: true });

export async function pingDb(): Promise<boolean> {
  try {
    await query('SELECT 1', [], { maxRetries: 1 });
    return true;
  } catch (err) {
    log.error('db_ping_fallo', { error: serializeError(err) });
    return false;
  }
}
