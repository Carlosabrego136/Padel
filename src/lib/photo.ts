import sharp from 'sharp';
import { badRequest } from './errors';
import { log, serializeError } from './log';

/**
 * Procesa la foto de perfil: valida el formato REAL leyendo la imagen (no se confía en el tipo declarado),
 * limita tamaño y píxeles, corrige la orientación, recorta a cuadrado y la guarda como WebP ligero.
 */

const MAX_BYTES = 1_500_000;
const MAX_PIXELS = 25_000_000;
const FORMATOS_PERMITIDOS = new Set(['jpeg', 'png', 'webp']);

export interface FotoProcesada {
  data: Buffer;
  mime: 'image/webp';
}

export async function procesarFoto(file: File | null | undefined, etiqueta: string): Promise<FotoProcesada | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw badRequest(`La foto de ${etiqueta} es demasiado pesada (máximo 1.5 MB)`);

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    throw badRequest(`No se pudo leer la foto de ${etiqueta}`);
  }

  try {
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata();
    if (!meta.format || !FORMATOS_PERMITIDOS.has(meta.format)) {
      throw badRequest(`La foto de ${etiqueta} debe ser JPG, PNG o WebP`);
    }
    const data = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
      .rotate()
      .resize(360, 360, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 80 })
      .toBuffer();
    return { data, mime: 'image/webp' };
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
    log.warn('foto_invalida', { error: serializeError(err) });
    throw badRequest(`No pudimos procesar la foto de ${etiqueta}. Usa una imagen JPG o PNG.`);
  }
}
