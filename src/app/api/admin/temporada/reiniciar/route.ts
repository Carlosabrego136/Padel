import { requireAdmin } from '@/lib/auth';
import { clientIp, json, route, assertSameOrigin } from '@/lib/http';
import { reiniciarTemporada } from '@/lib/ranking/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/temporada/reiniciar
 * Cierra la temporada actual: retira (archiva, sin borrar) todas las parejas pendientes o
 * aprobadas y libera el sorteo de todas las categorías, para dejar el ranking listo para una
 * nueva temporada. Las fechas se actualizan por separado desde Configuración.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const resultado = await reiniciarTemporada({ id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, resultado });
});
