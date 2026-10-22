import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Reglamento',
  description: 'Reglas oficiales del ranking de pádel de Pádel Life en Tepic, Nayarit.',
};

export default function ReglamentoPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ paddingTop: 72 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: 700 }}>
            <h1 className="section__title" style={{ textAlign: 'center', marginBottom: 32 }}>
              Reglamento del Ranking
            </h1>

            <div className="card" style={{ padding: '24px 28px', lineHeight: 1.7, fontSize: '0.9rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: 12 }}>
                1. Sistema de ranking
              </h2>
              <p>
                Las parejas se clasifican dentro de su categoría por posición numérica (1 = la más alta).
                El ranking se actualiza semanalmente: cada <strong>jornada</strong> va de martes a lunes a las 13:00 hrs
                (hora de Tepic, America/Mazatlan).
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                2. Retos
              </h2>
              <p>
                Cada pareja puede retar a la pareja que está <strong>exactamente una posición arriba</strong>. Si la pareja
                retadora gana, sube una posición y la otra baja. Si pierde, ambas se quedan donde están.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                3. Ascenso
              </h2>
              <p>
                La pareja en primer lugar de una categoría puede retar al <strong>último lugar de la categoría superior</strong>.
                Si gana, sube de categoría y la otra baja.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                4. Inactividad
              </h2>
              <p>
                Si una pareja no juega en una jornada (ni retó ni fue retada), desciende una posición. El primer
                lugar puede estar exento de esta regla según la configuración del torneo.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                5. Formato de partido
              </h2>
              <ul style={{ paddingLeft: 20, color: 'var(--color-text-secondary)' }}>
                <li>Mejor de <strong>3 sets</strong>.</li>
                <li>Sets 1 y 2: a 6 juegos con tie-break a 7 (diferencia de 2).</li>
                <li>Set 3 (si aplica): super tie-break a 10 puntos con diferencia de 2.</li>
              </ul>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                6. Inscripción y cuotas
              </h2>
              <p>
                Las parejas se inscriben desde este sitio. El club confirma la inscripción tras verificar el pago
                de la cuota correspondiente. La cuota varía antes y después de la fecha límite de inscripción.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                7. Resolución por club
              </h2>
              <p>
                Si un partido no se puede jugar, el club puede resolver el resultado a favor de una de las
                parejas, indicando el motivo. Esta decisión queda registrada en el historial.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                8. Retiro
              </h2>
              <p>
                Una pareja puede retirarse del ranking en cualquier momento. Las posiciones se ajustan
                automáticamente. El retiro queda registrado en el historial.
              </p>

              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)', margin: '20px 0 12px' }}>
                9. Datos personales
              </h2>
              <p>
                Al inscribirse, la pareja autoriza la publicación de su teléfono de contacto en la tabla de
                ranking. Los datos se usan exclusivamente para la operación del torneo.
              </p>
            </div>

            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <a href="/inscripcion" className="btn btn-primary">
                Inscribir pareja
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
