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
      <main style={{ paddingTop: 72 }}>
        <section className="section">
          <div className="container">
            <h1 className="section__title" style={{ textAlign: 'center', marginBottom: 8 }}>
              Ranking de Parejas
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 32, fontSize: '0.9rem' }}>
              Tabla de posiciones actualizada. Selecciona una categoría para ver las parejas.
            </p>
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
