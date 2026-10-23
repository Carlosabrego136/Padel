import { requireAdmin } from '@/lib/auth';
import { clientIp, json, route, assertSameOrigin } from '@/lib/http';
import { uuidSchema } from '@/lib/validation';
import { eliminarCampeon } from '@/lib/ranking/service';

export const DELETE = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  await eliminarCampeon(id, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
