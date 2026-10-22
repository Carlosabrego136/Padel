import { NextResponse } from 'next/server';
import { getJugadorFoto } from '@/lib/queries';
import { route } from '@/lib/http';

/**
 * GET /api/foto/[id]
 * Devuelve la foto de un jugador como imagen (webp). Cacheable 1 hora.
 */
export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const result = await getJugadorFoto(params.id);
  if (!result) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(result.foto), {
    status: 200,
    headers: {
      'Content-Type': result.mime,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Length': String(result.foto.length),
    },
  });
});
