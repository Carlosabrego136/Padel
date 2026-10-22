import { json, route } from '@/lib/http';
import { getCronSecret } from '@/lib/env';
import { cerrarJornadasVencidas } from '@/lib/ranking/service';
import { unauthorized } from '@/lib/errors';
import { log } from '@/lib/log';

function verificarCronSecret(req: Request): void {
  const auth = req.headers.get('authorization');
  const secret = getCronSecret();
  // Soporta: Authorization: Bearer <secret> o query param ?secret=<secret>
  if (auth === `Bearer ${secret}`) return;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === secret) return;
  throw unauthorized('Clave de cron no válida');
}

export const GET = route(async (req) => {
  verificarCronSecret(req);
  log.info('cron_cerrar_jornada_inicio');
  const resultado = await cerrarJornadasVencidas({ id: null, label: 'sistema:cron' });
  log.info('cron_cerrar_jornada_fin', { resultado });
  return json({ ok: true, resultado });
});

export const POST = route(async (req) => {
  verificarCronSecret(req);
  log.info('cron_cerrar_jornada_inicio');
  const resultado = await cerrarJornadasVencidas({ id: null, label: 'sistema:cron' });
  log.info('cron_cerrar_jornada_fin', { resultado });
  return json({ ok: true, resultado });
});
