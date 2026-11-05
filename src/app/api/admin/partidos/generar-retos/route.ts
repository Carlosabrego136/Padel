import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { generarRetosSchema } from '@/lib/validation';
import { generarRetosSemana } from '@/lib/ranking/service';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const data = generarRetosSchema.parse(body);
  const resultado = await generarRetosSemana(data.jornadaId, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, ...resultado });
});
