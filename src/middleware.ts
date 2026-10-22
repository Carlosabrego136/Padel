import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionToken } from './lib/session';

/**
 * Middleware de Next.js: protege /admin/* exigiendo cookie válida.
 * Solo verifica el JWT; la comprobación completa (¿sigue activo en la DB?) se hace
 * dentro de cada handler/page con requireAdmin/requireAdminPage.
 */

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  // La página de login nunca requiere sesión: evita un bucle de redirección infinito.
  if (req.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(cookie);
  if (!session) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
