import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { editarParejaSchema, uuidSchema } from '@/lib/validation';
import { editarPareja } from '@/lib/ranking/service';

export const PUT = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const body = await readJson(req);
  const data = editarParejaSchema.parse(body);
  await editarPareja(id, data, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
