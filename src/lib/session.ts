import { SignJWT, jwtVerify } from 'jose';
import { getAuthSecret } from './env';

/** Sesión del panel con JWT firmado (HS256). Solo depende de `jose`: es seguro para el middleware (edge). */

export const SESSION_COOKIE = 'pl_admin';
export const SESSION_TTL_SEC = 8 * 60 * 60;
const ISSUER = 'padel-life-ranking';

const secretKey = () => new TextEncoder().encode(getAuthSecret());

export interface SessionData {
  id: string;
  email: string;
}

export async function createSessionToken(admin: SessionData): Promise<string> {
  return new SignJWT({ email: admin.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(admin.id)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string | null | undefined): Promise<SessionData | null> {
  if (!token || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null; // firma inválida, expirado o mal formado
  }
}

export function getCookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
