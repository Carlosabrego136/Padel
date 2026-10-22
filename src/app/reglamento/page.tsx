import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Reglamento',
  description: 'Reglas oficiales del ranking de pádel de Pádel Life en Tepic, Nayarit.',
};

const REGLAS: { num: number; titulo: string; cuerpo: React.ReactNode }[] = [
  {
    num: 1,
    titulo: 'Sistema de ranking',
    cuerpo: (
      <>
        Las parejas se clasifican dentro de su categoría por posición numérica (1 = la más alta). El ranking se
        actualiza semanalmente: cada <strong>jornada</strong> va de martes a lunes a las 13:00 hrs (hora de Tepic,
        America/Mazatlan).
      </>
    ),
  },
  {
    num: 2,
    titulo: 'Retos',
    cuerpo: (
      <>
        Cada pareja puede retar a la pareja que está <strong>exactamente una posición arriba</strong>. Si la pareja
        retadora gana, sube una posición y la otra baja. Si pierde, ambas se quedan donde están.
      </>
    ),
  },
  {
    num: 3,
    titulo: 'Ascenso',
    cuerpo: (
      <>
        La pareja en primer lugar de una categoría puede retar al <strong>último lugar de la categoría superior</strong>.
        Si gana, sube de categoría y la otra baja.
      </>
    ),
  },
  {
    num: 4,
    titulo: 'Inactividad',
    cuerpo: (
      <>
        Si una pareja no juega en una jornada (ni retó ni fue retada), desciende una posición. El primer lugar
        puede estar exento de esta regla según la configuración del torneo.
      </>
    ),
  },
  {
    num: 5,
    titulo: 'Formato de partido',
    cuerpo: (
      <>
        Mejor de <strong>3 sets</strong>.
        <ul className="reglamento-list">
          <li>Sets 1 y 2: a 6 juegos con tie-break a 7 (diferencia de 2).</li>
          <li>Set 3 (si aplica): super tie-break a 10 puntos con diferencia de 2.</li>
        </ul>
      </>
    ),
  },
  {
    num: 6,
    titulo: 'Inscripción y cuotas',
    cuerpo: (
      <>
        Las parejas se inscriben desde este sitio. El club confirma la inscripción tras verificar el pago de la
        cuota correspondiente. La cuota varía antes y después de la fecha límite de inscripción.
      </>
    ),
  },
  {
    num: 7,
    titulo: 'Resolución por club',
    cuerpo: (
      <>
        Si un partido no se puede jugar, el club puede resolver el resultado a favor de una de las parejas,
        indicando el motivo. Esta decisión queda registrada en el historial.
      </>
    ),
  },
  {
    num: 8,
    titulo: 'Retiro',
    cuerpo: (
      <>
        Una pareja puede retirarse del ranking en cualquier momento. Las posiciones se ajustan automáticamente.
        El retiro queda registrado en el historial.
      </>
    ),
  },
  {
    num: 9,
    titulo: 'Datos personales',
    cuerpo: (
      <>
        Al inscribirse, la pareja autoriza la publicación de su teléfono de contacto en la tabla de ranking. Los
        datos se usan exclusivamente para la operación del torneo.
      </>
    ),
  },
];

export default function ReglamentoPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Banner con foto y título superpuesto */}
        <div className="page-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1767128890583-b3f8dc30bdbc?w=1920&q=80&auto=format&fit=crop"
            alt="Jugador de pádel en la cancha"
            loading="eager"
          />
          <div className="page-hero__scrim" />
          <div className="page-hero__text container">
            <h1>Reglamento</h1>
            <p>Reglas oficiales del ranking de Pádel Life</p>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 920 }}>
            <div className="rules-grid">
              {REGLAS.map((r) => (
                <div key={r.num} className="rule-card">
                  <div className="rule-card__num">{r.num}</div>
                  <h2 className="rule-card__title">{r.titulo}</h2>
                  <p className="rule-card__body">{r.cuerpo}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <Link href="/inscripcion" className="btn-chamfer">
                Inscribir pareja
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
