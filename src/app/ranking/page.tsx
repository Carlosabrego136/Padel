import type { Metadata } from 'next';
import { getCategorias, getRankingTodasCategorias, getJornadaActual, type CategoriaRow } from '@/lib/queries';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import RankingClient from './RankingClient';

export const metadata: Metadata = {
  title: 'Ranking',
  description: 'Consulta la tabla de posiciones del torneo de pádel en Tepic, Nayarit.',
};

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  let categorias: CategoriaRow[] = [];
  const ranking: Record<number, Awaited<ReturnType<typeof getRankingTodasCategorias>>> = {};

  try {
    // La categoría marcada como "oculta" (desde Configuración, en el panel admin) no se muestra
    // en el ranking público — por ejemplo, mientras no tiene parejas inscritas todavía.
    categorias = (await getCategorias()).filter((c) => !c.oculta);
    const jornadaActual = await getJornadaActual('America/Mazatlan').catch(() => null);
    // Una sola conexión para todas las categorías (el servidor de Aiven es compartido y
    // limita las conexiones simultáneas; traer todo junto evita que se forme fila).
    const todas = await getRankingTodasCategorias(jornadaActual?.id ?? null);
    for (const c of categorias) ranking[c.id] = todas.filter((p) => p.categoria_id === c.id);
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
      <SiteFooter />
    </>
  );
}
