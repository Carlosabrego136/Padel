import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { campeonManualSchema } from '@/lib/validation';
import { agregarCampeonManual } from '@/lib/ranking/service';
import { adminGetCampeones } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** GET /api/admin/campeones: lista los registros de campeones (automáticos y manuales). */
export const GET = route(async (req: Request) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const campeones = await adminGetCampeones();
  return json({ campeones });
});

/** POST /api/admin/campeones: agrega manualmente un registro de campeón. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const { categoriaId, jugador1, jugador2 } = campeonManualSchema.parse(body);
  await agregarCampeonManual({ categoriaId, jugador1, jugador2 }, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
