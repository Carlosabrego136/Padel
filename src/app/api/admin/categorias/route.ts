import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, readJson, route, assertSameOrigin } from '@/lib/http';
import { getCategorias } from '@/lib/queries';
import { setCategoriaOculta } from '@/lib/ranking/service';

export const GET = route(async (req) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const categorias = await getCategorias();
  return json(categorias);
});

const ocultaSchema = z.object({
  categoriaId: z.number().int().min(1),
  oculta: z.boolean(),
});

export const PATCH = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const body = await readJson(req);
  const data = ocultaSchema.parse(body);
  await setCategoriaOculta(data.categoriaId, data.oculta, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
