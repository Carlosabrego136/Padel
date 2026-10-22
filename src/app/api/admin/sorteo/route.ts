import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { sorteoSchema } from '@/lib/validation';
import { realizarSorteo } from '@/lib/ranking/service';
import { query } from '@/lib/db';
import { getCategorias } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sorteo
 * Devuelve las categorías con su estado de sorteo (si ya tienen posiciones asignadas
 * y cuántas parejas aprobadas están pendientes de sorteo).
 */
export const GET = route(async (req: Request) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);

  const categorias = await getCategorias();
  const r = await query<{ categoria_id: number; total: string; con_posicion: string }>(
    `SELECT categoria_id, count(*)::text AS total,
            count(*) FILTER (WHERE posicion IS NOT NULL)::text AS con_posicion
     FROM parejas WHERE estado = 'activa' GROUP BY categoria_id`,
  );
  const porCategoria = new Map(r.rows.map((row) => [row.categoria_id, row]));

  const resultado = categorias.map((c) => {
    const stats = porCategoria.get(c.id);
    const total = stats ? parseInt(stats.total, 10) : 0;
    const conPosicion = stats ? parseInt(stats.con_posicion, 10) : 0;
    return {
      categoriaId: c.id,
      nombre: c.nombre,
      totalActivas: total,
      conPosicion,
      sinPosicion: total - conPosicion,
      sorteado: total > 0 && conPosicion === total,
    };
  });

  return json({ categorias: resultado });
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const { categoriaId } = sorteoSchema.parse(body);
  const resultado = await realizarSorteo(categoriaId, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true, resultado });
});
