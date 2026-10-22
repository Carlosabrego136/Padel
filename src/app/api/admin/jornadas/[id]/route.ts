import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, route } from '@/lib/http';
import { adminGetPartidos } from '@/lib/queries';
import { badRequest } from '@/lib/errors';

export const GET = route(async (req, { params }: { params: { id: string } }) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) throw badRequest('ID de jornada no válido');
  const partidos = await adminGetPartidos(id);
  return json(partidos);
});
