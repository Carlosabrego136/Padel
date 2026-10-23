import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, badRequest, forbidden } from './errors';
import { log, serializeError } from './log';

/** Utilidades comunes de las rutas API: IP, lectura segura del cuerpo, origen y manejo uniforme de errores. */

export function clientIp(req: Request): string | null {
  const raw = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip')?.trim();
  return raw && isIP(raw) ? raw : null;
}

export async function readJson<T = unknown>(req: Request, maxBytes = 50_000): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > maxBytes) throw new AppError(413, 'La solicitud es demasiado grande');
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw badRequest('Formato de solicitud no válido');
  let text: string;
  try {
    text = await req.text();
  } catch {
    throw badRequest('No se pudo leer la solicitud');
  }
  if (text.length > maxBytes) throw new AppError(413, 'La solicitud es demasiado grande');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw badRequest('JSON no válido');
  }
}

/** Protección CSRF adicional a SameSite=Lax: el origen de una petición que modifica datos debe ser este mismo sitio. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw forbidden('Origen no válido');
    }
    if (originHost !== host) throw forbidden('Origen no permitido');
    return;
  }
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw forbidden('Origen no permitido');
}

export function json(data: unknown, init?: number | ResponseInit): NextResponse {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  return NextResponse.json(data, { ...responseInit, headers: { 'Cache-Control': 'no-store', ...(responseInit?.headers ?? {}) } });
}

/** Traduce cualquier error a una respuesta segura: sin pilas, sin SQL, sin datos sensibles. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return json({ error: err.message, code: err.code, fields: err.fields }, err.status);
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join('.') || '_'] = issue.message;
    return json({ error: err.issues[0]?.message ?? 'Datos no válidos', code: 'validation', fields }, 400);
  }
  const code = (err as { code?: string } | null)?.code;
  if (code === '23505') return json({ error: 'Ese registro ya existe o entra en conflicto con otro.', code: 'duplicate' }, 409);
  if (code === '23503') return json({ error: 'No se puede completar: hay datos relacionados.', code: 'related' }, 409);
  if (code === '23514') return json({ error: 'Los datos no cumplen las reglas del sistema.', code: 'check' }, 400);
  if (code === '40001' || code === '40P01' || code === '55P03' || code === '53300') {
    return json({ error: 'El sistema está ocupado. Inténtalo de nuevo en unos segundos.', code: 'busy' }, 503);
  }
  log.error('error_no_controlado', { error: serializeError(err) });
  return json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.', code: 'internal' }, 500);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Envuelve una ruta: cualquier excepción termina en errorResponse (nunca se queda colgada ni filtra datos). */
export function route<C = unknown>(handler: Handler<C>): (req: Request, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
