import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { configSchema, CONFIG_DEFS } from '@/lib/validation';
import { actualizarConfig } from '@/lib/ranking/service';
import { badRequest } from '@/lib/errors';

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const { clave, valor } = configSchema.parse(body);

  const def = CONFIG_DEFS[clave];
  if (!def) throw badRequest('Configuración desconocida');
  const errorValidacion = def.validar(valor);
  if (errorValidacion) throw badRequest(errorValidacion);

  await actualizarConfig(clave, valor, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
