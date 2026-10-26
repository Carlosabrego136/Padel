import { requireAdmin } from '@/lib/auth';
import { clientIp, json, readFormData, fileField, route, assertSameOrigin } from '@/lib/http';
import { badRequest } from '@/lib/errors';
import { uuidSchema } from '@/lib/validation';
import { actualizarFotoJugador } from '@/lib/ranking/service';

/**
 * PUT /api/admin/jugadores/[id]/foto
 * Sube o reemplaza la foto de un jugador desde el panel admin (multipart/form-data,
 * campo "foto").
 */
export const PUT = route(async (req, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  const admin = await requireAdmin(req, ip);
  const id = uuidSchema.parse(params.id);
  const fd = await readFormData(req);
  const foto = fileField(fd, 'foto');
  if (!foto) throw badRequest('Selecciona una foto para subir');
  await actualizarFotoJugador(id, foto, { id: admin.id, label: admin.email, ip: admin.ip });
  return json({ ok: true });
});
