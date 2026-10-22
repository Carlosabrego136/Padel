import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, route } from '@/lib/http';
import { getCategorias } from '@/lib/queries';

export const GET = route(async (req) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const categorias = await getCategorias();
  return json(categorias);
});
