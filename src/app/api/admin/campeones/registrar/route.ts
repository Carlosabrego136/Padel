import { requireAdmin } from '@/lib/auth';
import { clientIp, json, route, assertSameOrigin } from '@/lib/http';
import { registrarCampeonesTemporada } from '@/lib/ranking/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campeones/registrar
 * Toma la pareja en 1er lugar de cada categoría EN ESTE MOMENTO y la registra como campeona
 * de la temporada, para que su siguiente inscripción (con los mismos dos jugadores) sea gratis.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const resultado = await registrarCampeonesTemporada({ id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, resultado });
});
