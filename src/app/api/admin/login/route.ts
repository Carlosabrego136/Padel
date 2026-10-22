import { NextResponse } from 'next/server';
import { iniciarSesion } from '@/lib/auth';
import { SESSION_COOKIE, SESSION_TTL_SEC } from '@/lib/session';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { loginSchema } from '@/lib/validation';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const body = await readJson(req);
  const { email, password } = loginSchema.parse(body);
  const ip = clientIp(req);
  const { token, admin } = await iniciarSesion(email, password, ip);

  const res = json({ ok: true, admin: { id: admin.id, email: admin.email } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
  return res;
});
