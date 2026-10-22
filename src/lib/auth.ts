import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { badRequest, tooMany, unauthorized } from './errors';
import { log } from './log';
import { SESSION_COOKIE, createSessionToken, getCookieFromHeader, readSessionToken } from './session';

/** Autenticación del panel (acceso a base de datos + bcrypt). NO importar desde el middleware. */

export interface AdminCtx {
  id: string;
  email: string;
  ip: string | null;
}

const BCRYPT_COST = 12;
const LOGIN_WINDOW_SEC = 15 * 60;
const MAX_LOGIN_PER_IP = 20;
const MAX_LOGIN_PER_EMAIL = 6;

let dummyHash: string | undefined;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await bcrypt.hash('x' + randomUUID(), BCRYPT_COST);
  return dummyHash;
}

const digest = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < 10 || plain.length > 128) throw badRequest('La contraseña debe tener entre 10 y 128 caracteres');
  return bcrypt.hash(plain, BCRYPT_COST);
}

async function hit(clave: string): Promise<number> {
  const r = await query<{ n: number }>('SELECT rate_limit_hit($1, $2) AS n', [clave, LOGIN_WINDOW_SEC], { maxRetries: 0 });
  return r.rows[0]?.n ?? 0;
}

/** Límite de solicitudes por clave (p. ej. inscripciones por IP). Lanza 429 al exceder. */
export async function limitar(clave: string, max: number, ventanaSeg: number): Promise<void> {
  const r = await query<{ n: number }>('SELECT rate_limit_hit($1, $2) AS n', [clave, ventanaSeg], { maxRetries: 0 });
  if ((r.rows[0]?.n ?? 0) > max) throw tooMany();
}

export async function iniciarSesion(
  emailRaw: string,
  password: string,
  ip: string | null,
): Promise<{ token: string; admin: { id: string; email: string } }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) || password.length < 1 || password.length > 128) {
    throw unauthorized('Correo o contraseña incorrectos');
  }

  const [porIp, porCorreo] = await Promise.all([hit(`login:ip:${digest(ip ?? 'sin-ip')}`), hit(`login:email:${digest(email)}`)]);
  if (porIp > MAX_LOGIN_PER_IP || porCorreo > MAX_LOGIN_PER_EMAIL) {
    log.warn('login_bloqueado_por_limite', { ip, correo: digest(email) });
    throw tooMany('Demasiados intentos de acceso. Espera 15 minutos.');
  }

  const r = await query<{ id: string; email: string; password_hash: string; activo: boolean }>(
    'SELECT id, email, password_hash, activo FROM admins WHERE email = $1',
    [email],
  );
  const row = r.rows[0];
  // Siempre se ejecuta bcrypt, exista o no el usuario, para no revelar cuentas por tiempo de respuesta.
  const ok = await bcrypt.compare(password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !row.activo || !ok) {
    log.warn('login_fallido', { ip, correo: digest(email) });
    throw unauthorized('Correo o contraseña incorrectos');
  }

  await query('UPDATE admins SET ultimo_acceso = now() WHERE id = $1', [row.id], { maxRetries: 0 }).catch(() => undefined);
  const token = await createSessionToken({ id: row.id, email: row.email });
  return { token, admin: { id: row.id, email: row.email } };
}

/** Verifica la cookie de sesión Y que el administrador siga activo en la base de datos. */
export async function requireAdmin(req: Request, ip: string | null): Promise<AdminCtx> {
  const token = getCookieFromHeader(req.headers.get('cookie'), SESSION_COOKIE);
  const session = await readSessionToken(token);
  if (!session) throw unauthorized();
  const r = await query<{ activo: boolean }>('SELECT activo FROM admins WHERE id = $1', [session.id]);
  if (!r.rows[0]?.activo) throw unauthorized();
  return { id: session.id, email: session.email, ip };
}

export async function adminActivo(id: string): Promise<boolean> {
  const r = await query<{ activo: boolean }>('SELECT activo FROM admins WHERE id = $1', [id]);
  return !!r.rows[0]?.activo;
}
