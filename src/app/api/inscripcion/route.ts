import { inscripcionSchema } from '@/lib/validation';
import { assertSameOrigin, readFormData, fileField, json, route, clientIp } from '@/lib/http';
import { registrarPareja } from '@/lib/ranking/service';
import { log } from '@/lib/log';

/**
 * POST /api/inscripcion
 * Registra una nueva pareja (estado = 'pendiente').
 * El formulario envía multipart/form-data (campos de texto + foto opcional de cada
 * jugador). Delega toda la lógica a registrarPareja del service layer, que valida,
 * inserta dentro de transacción y registra auditoría.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);

  const fd = await readFormData(req);

  const str = (name: string): string => {
    const v = fd.get(name);
    return typeof v === 'string' ? v.trim() : '';
  };

  const body = {
    categoria: str('categoria'),
    jugador1: {
      nombre: str('j1_nombre'),
      genero: str('j1_genero'),
      telefono: str('j1_telefono') || undefined,
    },
    jugador2: {
      nombre: str('j2_nombre'),
      genero: str('j2_genero'),
      telefono: str('j2_telefono') || undefined,
    },
    telefonoContacto: str('telefonoContacto'),
    aceptaPublicar: fd.get('aceptaPublicar') === 'on',
    aceptaReglamento: fd.get('aceptaReglamento') === 'on',
  };

  const data = inscripcionSchema.parse(body);
  const foto1 = fileField(fd, 'foto1');
  const foto2 = fileField(fd, 'foto2');
  const ip = clientIp(req);

  const result = await registrarPareja(data, foto1, foto2, ip);

  log.info('inscripcion_nueva', { parejaId: result.parejaId, ip });
  return json({ ok: true, id: result.parejaId }, 201);
});
