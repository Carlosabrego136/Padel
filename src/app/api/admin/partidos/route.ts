import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { crearPartidoSchema } from '@/lib/validation';
import { crearPartido } from '@/lib/ranking/service';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const data = crearPartidoSchema.parse(body);
  const partido = await crearPartido(data, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, partido });
});
