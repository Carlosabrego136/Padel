import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import InscripcionForm from './InscripcionForm';

export const metadata: Metadata = {
  title: 'Inscripción',
  description: 'Inscribe a tu pareja en el ranking de pádel de Pádel Life en Tepic, Nayarit.',
};

const CATEGORIAS = ['Libre', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Femenil'];

export default function InscripcionPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="page-hero page-hero--sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1770230901556-4e1c0bacfb09?w=1920&q=80&auto=format&fit=crop"
            alt="Pareja jugando pádel"
            loading="eager"
          />
          <div className="page-hero__scrim" />
          <div className="page-hero__text container">
            <h1>Inscribir pareja</h1>
            <p>Llena el formulario y el club revisará tu inscripción.</p>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 1040 }}>
            <div className="insc-layout">
              {/* Panel lateral */}
              <aside className="insc-side">
                <div className="insc-side__card">
                  <p className="insc-side__title">Cómo funciona</p>
                  <div className="insc-side__steps">
                    <div className="insc-side__step">
                      <span className="insc-side__step-num">1</span>
                      Llena los datos de tu pareja y categoría.
                    </div>
                    <div className="insc-side__step">
                      <span className="insc-side__step-num">2</span>
                      El club revisa y confirma tu inscripción.
                    </div>
                    <div className="insc-side__step">
                      <span className="insc-side__step-num">3</span>
                      Entras al ranking y empiezas a retar.
                    </div>
                  </div>
                </div>

                <div className="insc-side__card">
                  <p className="insc-side__title">Categorías disponibles</p>
                  <div className="insc-side__cats">
                    {CATEGORIAS.map((c) => (
                      <span key={c} className="insc-side__cat-chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="insc-side__ball">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1767128890583-b3f8dc30bdbc?w=900&q=80&auto=format&fit=crop"
                    alt="Jugador de pádel en la cancha"
                    loading="lazy"
                  />
                  <div className="insc-side__ball-overlay" />
                  <p className="insc-side__ball-text">Compite. Reta. Sube de posición.</p>
                </div>
              </aside>

              {/* Formulario */}
              <div className="insc-card">
                <div className="insc-card__inner">
                  <InscripcionForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
