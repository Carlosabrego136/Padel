import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { pausaSchema, uuidSchema } from '@/lib/validation';
import { actualizarPausaPareja } from '@/lib/ranking/service';

/**
 * PUT /api/admin/parejas/[id]/pausa
 * Pausa o reactiva a una pareja para la próxima generación de retos. No cambia su estado
 * ni su posición: sigue apareciendo en el ranking público igual que siempre.
 */
export const PUT = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const body = await readJson(req);
  const { pausadaRetos } = pausaSchema.parse(body);
  await actualizarPausaPareja(id, pausadaRetos, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
