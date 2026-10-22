import type { Metadata } from 'next';
import { getCategorias, getRankingCategoria, type CategoriaRow } from '@/lib/queries';
import SiteHeader from '@/components/SiteHeader';
import RankingClient from './RankingClient';

export const metadata: Metadata = {
  title: 'Ranking',
  description: 'Consulta la tabla de posiciones del torneo de pádel en Tepic, Nayarit.',
};

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  let categorias: CategoriaRow[] = [];
  const ranking: Record<number, Awaited<ReturnType<typeof getRankingCategoria>>> = {};

  try {
    categorias = await getCategorias();
    // Pre-fetch ranking for all categories in parallel
    const results = await Promise.all(
      categorias.map((c) => getRankingCategoria(c.id).then((r) => ({ id: c.id, data: r }))),
    );
    for (const r of results) ranking[r.id] = r.data;
  } catch {
    categorias = [];
  }

  return (
    <>
      <SiteHeader />
      <main>
        <div className="page-hero page-hero--sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1612534847738-b3af9bc31f0c?w=1920&q=80&auto=format&fit=crop"
            alt="Raqueta de pádel en la cancha"
            loading="eager"
          />
          <div className="page-hero__scrim" />
          <div className="page-hero__text container">
            <h1>Ranking de Parejas</h1>
            <p>Tabla de posiciones actualizada. Selecciona una categoría para ver las parejas.</p>
          </div>
        </div>
        <section className="section">
          <div className="container">
            {categorias.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No se pudieron cargar las categorías. Inténtalo de nuevo más tarde.
              </p>
            ) : (
              <RankingClient categorias={categorias} ranking={ranking} />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
