import { Client, type ClientConfig, type QueryResult, type QueryResultRow } from 'pg';
import { getDbEnv } from './env';
import { log, serializeError } from './log';

/**
 * Acceso a PostgreSQL (Aiven).
 *  - SIN Pool: el servidor Aiven es compartido (20 conexiones para 7 proyectos) y un Pool deja
 *    conexiones "dormidas" que acaparan ese límite. Cada consulta/transacción abre su propio
 *    `Client`, lo usa y lo cierra con `client.end()`.
 *  - Máximo 2 conexiones simultáneas por instancia (semáforo simple con cola de espera).
 *  - Reintentos SOLO al conectar (no al ejecutar la consulta) y solo para errores transitorios
 *    de conexión: 53300 (sin conexiones disponibles), 57P03, ECONNRESET, ETIMEDOUT.
 *  - Las escrituras viven dentro de withTx(): un actor obligatorio queda registrado en la
 *    sesión (app.actor) para que los triggers de auditoría sepan quién modificó qué.
 */

const MAX_RETRIES_HARD_LIMIT = 3;
const TX_RETRY_CODES = new Set(['40001', '40P01']); // deadlock/serialización dentro de una transacción

// Errores de CONEXIÓN (no de SQL): el servidor está lleno o tardó en responder. Se reintenta
// solo el intento de conectar, con espera creciente + un poco de azar.
const CONNECT_RETRY_CODES = new Set(['53300', '57P03', 'ECONNRESET', 'ETIMEDOUT']);
const CONNECT_RETRY_DELAYS_MS = [300, 700, 1300];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const codeOf = (err: unknown): string | undefined => (err as { code?: string } | null)?.code;

function buildConfig(): ClientConfig {
  const { DATABASE_URL, DATABASE_CA } = getDbEnv();
  const url = new URL(DATABASE_URL.replace(/^postgresql:/i, 'postgres:'));
  const sslmode = url.searchParams.get('sslmode');
  // pg trata sslmode=require como verify-full y pisaría nuestra configuración TLS: lo quitamos y lo manejamos aquí.
  url.searchParams.delete('sslmode');

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  let ssl: ClientConfig['ssl'];
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
    connectionTimeoutMillis: 12_000,
    statement_timeout: 15_000,
    query_timeout: 15_000,
    idle_in_transaction_session_timeout: 20_000,
    application_name: 'padel-life-ranking',
  };
}

// ---------------------------------------------------------------------------
// Semáforo: máximo 2 conexiones simultáneas a Aiven por instancia de la app.
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_CONNECTIONS = 2;
let activeConnections = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeConnections < MAX_CONCURRENT_CONNECTIONS) {
        activeConnections++;
        resolve();
      } else {
        waitQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseSlot(): void {
  activeConnections--;
  const next = waitQueue.shift();
  if (next) next();
}

/** Abre un Client nuevo, reintentando solo si el FALLO AL CONECTAR es transitorio (no reintenta consultas SQL). */
async function connectWithRetry(): Promise<Client> {
  for (let attempt = 0; ; attempt++) {
    const client = new Client(buildConfig());
    client.on('error', (err) => log.error('db_client_error', { error: serializeError(err) }));
    try {
      await client.connect();
      return client;
    } catch (err) {
      const code = codeOf(err);
      if (code && CONNECT_RETRY_CODES.has(code) && attempt < CONNECT_RETRY_DELAYS_MS.length) {
        log.warn('db_connect_reintento', { intento: attempt + 1, error: serializeError(err) });
        await sleep(CONNECT_RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 200));
        continue;
      }
      throw err;
    }
  }
}

/** Reserva un cupo del semáforo, conecta (con reintento), ejecuta `fn` y SIEMPRE cierra la conexión y libera el cupo. */
async function withConnection<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  await acquireSlot();
  let client: Client | undefined;
  try {
    client = await connectWithRetry();
    return await fn(client);
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        /* la conexión se descarta de todos modos */
      }
    }
    releaseSlot();
  }
}

/** Consulta de SOLO LECTURA (o escritura idempotente). Abre su propia conexión y la cierra al terminar. */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
  _opts: { maxRetries?: number } = {},
): Promise<QueryResult<R>> {
  return withConnection((client) => client.query<R>(text, params as any[]));
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

function makeTx(client: Client, actor: Actor): Tx {
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

/**
 * Transacción con su propia conexión dedicada (abre, BEGIN…COMMIT/ROLLBACK, cierra). Sigue sin
 * usar Pool: la conexión vive solo mientras dura la transacción (normalmente milisegundos) y
 * jamás queda abierta "dormida" entre peticiones.
 */
export async function withTx<T>(actor: Actor, fn: (tx: Tx) => Promise<T>, opts: TxOptions = {}): Promise<T> {
  const maxRetries = Math.min(Math.max(opts.maxRetries ?? 3, 0), MAX_RETRIES_HARD_LIMIT);

  for (let attempt = 0; ; attempt++) {
    await acquireSlot();
    let client: Client | undefined;
    try {
      client = await connectWithRetry();
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
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          log.error('db_rollback_fallo', { error: serializeError(rollbackErr) });
        }
      }
      const c = codeOf(err);
      if (attempt < maxRetries && c && TX_RETRY_CODES.has(c)) {
        log.warn('db_tx_reintento', { intento: attempt + 1, codigo: c });
        await sleep(100 * 2 ** attempt + Math.floor(Math.random() * 50));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try {
          await client.end();
        } catch {
          /* la conexión se descarta de todos modos */
        }
      }
      releaseSlot();
    }
  }
}

/** Transacción de administrador: la auditoría es OBLIGATORIA (se revierte si falta). */
export const withAdminTx = <T>(actor: Actor, fn: (tx: Tx) => Promise<T>, opts: Omit<TxOptions, 'requireAudit'> = {}) =>
  withTx(actor, fn, { ...opts, requireAudit: true });

export async function pingDb(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    log.error('db_ping_fallo', { error: serializeError(err) });
    return false;
  }
}
