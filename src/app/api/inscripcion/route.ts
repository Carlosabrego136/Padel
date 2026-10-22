import { inscripcionSchema } from '@/lib/validation';
import { assertSameOrigin, readJson, json, route, clientIp } from '@/lib/http';
import { registrarPareja } from '@/lib/ranking/service';
import { log } from '@/lib/log';

/**
 * POST /api/inscripcion
 * Registra una nueva pareja (estado = 'pendiente').
 * Delega toda la lógica a registrarPareja del service layer,
 * que valida, inserta dentro de transacción y registra auditoría.
 *
 * Fotos se omiten por ahora (el formulario no las envía con JSON).
 * Se pueden agregar cuando se migre a multipart/form-data.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);

  const body = await readJson(req, 10_000);
  const data = inscripcionSchema.parse(body);
  const ip = clientIp(req);

  const result = await registrarPareja(data, null, null, ip);

  log.info('inscripcion_nueva', { parejaId: result.parejaId, ip });
  return json({ ok: true, id: result.parejaId }, 201);
});
