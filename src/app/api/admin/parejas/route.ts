import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, route } from '@/lib/http';
import { adminGetParejas } from '@/lib/queries';

export const GET = route(async (req) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);

  const url = new URL(req.url);
  const catRaw = url.searchParams.get('categoriaId');
  const estado = url.searchParams.get('estado') ?? undefined;
  const categoriaId = catRaw ? parseInt(catRaw, 10) : undefined;

  const parejas = await adminGetParejas(
    Number.isFinite(categoriaId) ? categoriaId : undefined,
    estado,
  );
  return json(parejas);
});
