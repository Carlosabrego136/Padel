import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminActivo, type AdminCtx } from './auth';
import { SESSION_COOKIE, readSessionToken } from './session';

/** Para páginas del panel (server components): redirige al login si no hay sesión válida y activa. */
export async function requireAdminPage(): Promise<AdminCtx> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) redirect('/admin/login');
  let activo = false;
  try {
    activo = await adminActivo(session.id);
  } catch {
    redirect('/admin/login?error=db');
  }
  if (!activo) redirect('/admin/login');
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  return { id: session.id, email: session.email, ip };
}
