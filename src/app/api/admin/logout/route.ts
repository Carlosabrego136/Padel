import { SESSION_COOKIE } from '@/lib/session';
import { json, route, assertSameOrigin } from '@/lib/http';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
});
