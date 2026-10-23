import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getConfig } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Reglamento',
  description: 'Reglamento oficial del ranking de pádel de Pádel Life en Tepic, Nayarit.',
};

export const dynamic = 'force-dynamic';

function fmtFecha(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

interface Regla {
  num: number;
  titulo: string;
  cuerpo: ReactNode;
}

function construirReglas(cfg: Map<string, string>): Regla[] {
  const inicio = fmtFecha(cfg.get('inicio_ranking'));
  const fin = fmtFecha(cfg.get('fin_ranking'));
  const limite = fmtFecha(cfg.get('fecha_limite_inscripcion'));
  const pausaInicio = fmtFecha(cfg.get('pausa_inicio'));
  const pausaFin = fmtFecha(cfg.get('pausa_fin'));
  const cuotaInicial = cfg.get('cuota_inicial') ?? '200';
  const cuotaTardia = cfg.get('cuota_tardia') ?? '300';

  return [
    {
      num: 1,
      titulo: 'Cómo funciona el ranking',
      cuerpo: (
        <>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Posiciones iniciales</p>
            <p>
              La primera vez que arranca el ranking, las posiciones de cada categoría se asignan por{' '}
              <strong>sorteo</strong> entre las parejas inscritas. Esto ocurre <strong>solo una vez</strong>; a
              partir de ahí, cada posición se gana jugando.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Retos</p>
            <p>
              Cada pareja puede retar únicamente a la pareja que está <strong>exactamente una posición arriba</strong>.
              Juegas <strong>un solo partido por semana</strong>: una semana puede tocarte retar a la pareja de
              arriba, y otra semana te puede tocar que te rete la pareja de abajo — nunca los dos al mismo tiempo.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Resultado del partido</p>
            <p>Si ganas, subes una posición. Si pierdes, bajas una. No se pueden saltar lugares.</p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Ascenso de categoría</p>
            <p>
              La pareja en primer lugar de una categoría puede retar a la pareja del{' '}
              <strong>último lugar de la categoría superior</strong>. Si gana, asciende de categoría y la otra
              desciende; si pierde, ambas se quedan donde están.
            </p>
          </div>
        </>
      ),
    },
    {
      num: 2,
      titulo: 'Inscripción y participación',
      cuerpo: (
        <>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">2.1 Una sola categoría y una sola pareja</p>
            <p>
              Cada jugador podrá inscribirse únicamente en una categoría y con una sola pareja durante el ranking.
              No se permite participar en diferentes categorías ni registrarse con distintas parejas.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">2.2 Costo de inscripción y fecha límite</p>
            <p>
              Inscripción inicial: <strong>${cuotaInicial} pesos por jugador</strong>, para quienes se inscriban
              {limite ? <> antes del <strong>{limite}</strong></> : ' dentro del periodo'} establecido por el club.
              Después de esa fecha, el costo será de <strong>${cuotaTardia} pesos por jugador</strong>, sujeto a
              disponibilidad de lugares y autorización del club.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">2.3 Salida y reingreso al ranking</p>
            <p>
              Si una pareja deja de jugar y más adelante quiere regresar, reingresa en el{' '}
              <strong>último lugar de su categoría</strong>, sin conservar su posición anterior, vuelve a pagar su
              inscripción vigente y tiene que ganarse de nuevo su lugar jugando.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">2.4 Participación femenil</p>
            <p>
              Las mujeres eligen libremente si quieren competir en la categoría <strong>Femenil</strong> o junto con
              los hombres en Tercera, Cuarta, Quinta o Sexta Fuerza, según su nivel, inscribiéndose con un hombre o
              con otra mujer como pareja.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">2.5 Teléfono de contacto</p>
            <p>
              Es obligatorio dar un teléfono de contacto por pareja y autorizar su publicación en la página, para
              que los rivales puedan coordinar sus partidos directamente.
            </p>
          </div>
        </>
      ),
    },
    {
      num: 3,
      titulo: 'Formato de los partidos',
      cuerpo: (
        <>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">3.1 Modalidad</p>
            <p>Todos los partidos se juegan a ganar dos de tres sets.</p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">3.2 Tercer set</p>
            <p>
              Si hay empate a un set por pareja, el tercer set se juega con un{' '}
              <strong>súper tie-break a 10 puntos</strong>, con diferencia obligatoria de 2 puntos para ganar.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">3.3 Punto de oro</p>
            <p>
              Todos los juegos se juegan con <strong>punto de oro</strong> en 40 iguales: no hay ventaja, al llegar
              a 40-40 se juega un solo punto que define el juego.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">3.4 Elección del lado de saque</p>
            <p>
              En el punto de oro, la pareja que recibe el saque elige a cuál de sus dos integrantes se le hace el
              servicio.
            </p>
          </div>
        </>
      ),
    },
    {
      num: 4,
      titulo: 'Partidos no jugados por falta de acuerdo',
      cuerpo: (
        <>
          <p>
            Ambas parejas tienen la obligación de mantener comunicación y disposición para ponerse de acuerdo en el
            día y la hora de su partido, proponiendo horarios razonables.
          </p>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Si no logran ponerse de acuerdo</p>
            <p>
              Deben presentar al club capturas de pantalla de sus conversaciones, donde se vean los intentos de
              coordinación, las propuestas de horario y la falta de acuerdo o disponibilidad de alguna de las
              partes.
            </p>
          </div>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Resolución del club</p>
            <p>
              El club revisa la evidencia presentada por ambas partes y determina qué pareja gana el partido, con
              base en la disposición e intentos de acuerdo que haya mostrado cada quien. Esa decisión es el
              resultado oficial del partido para el ranking.
            </p>
          </div>
          <div className="rule-card__note">
            Si ninguna de las dos parejas se comunica ni hace nada por jugar, ambas bajan una posición. Siempre
            deben jugar: esta regla existe para que nadie se vea perjudicado por la falta de colaboración de la
            otra pareja.
          </div>
        </>
      ),
    },
    {
      num: 5,
      titulo: 'Calendario, pausa y finalización',
      cuerpo: (
        <>
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Jornadas semanales</p>
            <p>
              Las parejas se clasifican dentro de su categoría por posición numérica (1 = la más alta). Cada{' '}
              <strong>jornada</strong> va de martes a lunes a la 1:00 p.m. (hora de Tepic, America/Mazatlan): en
              ese periodo coordinas y juegas tu partido. El lunes a la 1:00 p.m. cierra la jornada, por la tarde se
              actualiza el ranking, y el martes empieza la nueva semana de retos.
            </p>
          </div>
          {(inicio || fin) && (
            <div className="rule-card__sub">
              <p className="rule-card__sub-title">Duración del ranking</p>
              <p>
                {inicio && <>Inicia el <strong>{inicio}</strong>. </>}
                {fin && <>Concluye oficialmente el <strong>{fin}</strong>, fecha en la que se determinan las
                posiciones finales de cada categoría.</>}
              </p>
            </div>
          )}
          {(pausaInicio || pausaFin) && (
            <div className="rule-card__sub">
              <p className="rule-card__sub-title">Pausa vacacional</p>
              <p>
                El ranking tendrá una pausa del <strong>{pausaInicio}</strong> al <strong>{pausaFin}</strong>,
                inclusive. Durante estas fechas no hay jornadas ni descensos por inactividad.
              </p>
            </div>
          )}
          <div className="rule-card__sub">
            <p className="rule-card__sub-title">Torneo final</p>
            <p>
              Al terminar la temporada, el club podrá organizar un torneo especial con las mejores parejas de cada
              categoría.
            </p>
          </div>
        </>
      ),
    },
  ];
}

export default async function ReglamentoPage() {
  const config = await getConfig().catch(() => new Map<string, string>());
  const REGLAS = construirReglas(config);

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
            <p>Reglamento oficial del ranking de Pádel Life</p>
          </div>
        </div>

        <section className="section">
          <div className="container" style={{ maxWidth: 920 }}>
            <div className="rules-grid">
              {REGLAS.map((r) => (
                <div key={r.num} className="rule-card">
                  <div className="rule-card__num">{r.num}</div>
                  <h2 className="rule-card__title">{r.titulo}</h2>
                  <div className="rule-card__body">{r.cuerpo}</div>
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
