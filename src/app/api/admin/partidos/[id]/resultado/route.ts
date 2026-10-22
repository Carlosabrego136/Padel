import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { resultadoSchema, uuidSchema } from '@/lib/validation';
import { registrarResultado } from '@/lib/ranking/service';

export const POST = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const body = await readJson(req);
  const { sets } = resultadoSchema.parse(body);
  const resultado = await registrarResultado(id, sets, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, resultado });
});
