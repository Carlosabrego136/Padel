import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { aprobarSchema, uuidSchema } from '@/lib/validation';
import { actualizarPagoPareja } from '@/lib/ranking/service';

/**
 * PUT /api/admin/parejas/[id]/pago
 * Marca o desmarca manualmente el pago de una pareja, por separado de aprobarla.
 */
export const PUT = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const body = await readJson(req);
  const { pagoConfirmado } = aprobarSchema.parse(body);
  await actualizarPagoPareja(id, pagoConfirmado, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
