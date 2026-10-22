import { requireAdmin } from '@/lib/auth';
import { clientIp, json, route, assertSameOrigin } from '@/lib/http';
import { cerrarJornada } from '@/lib/ranking/service';

export const POST = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const jornadaId = parseInt(params.id, 10);
  if (!Number.isFinite(jornadaId) || jornadaId < 1) {
    return json({ error: 'ID de jornada no válido' }, 400);
  }
  const resultado = await cerrarJornada(jornadaId, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, resultado });
});
