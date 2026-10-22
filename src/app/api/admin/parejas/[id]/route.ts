import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, route } from '@/lib/http';
import { uuidSchema } from '@/lib/validation';
import { adminGetPareja } from '@/lib/queries';
import { notFound } from '@/lib/errors';

export const GET = route(async (req, { params }: { params: { id: string } }) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const pareja = await adminGetPareja(id);
  if (!pareja) throw notFound('Pareja no encontrada');
  return json(pareja);
});
