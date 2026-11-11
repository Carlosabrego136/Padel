import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPareja, getCategorias, getJornadaActual, hayRetosGenerados } from '@/lib/queries';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pareja = await getPareja(id).catch(() => null);
  if (!pareja) return { title: 'Pareja no encontrada' };
  const nombres = pareja.jugadores.map((j) => j.nombre).join(' / ');
  return { title: nombres, description: `Detalle de la pareja ${nombres} en el ranking de Pádel Life.` };
}

export const dynamic = 'force-dynamic';

export default async function ParejaPage({ params }: Props) {
  const { id } = await params;
  let pareja;
  try {
    pareja = await getPareja(id);
  } catch {
    notFound();
  }
  if (!pareja) notFound();

  const categorias = await getCategorias().catch(() => []);
  const catNombre = categorias.find((c) => c.id === pareja.categoria_id)?.nombre ?? `Categoría ${pareja.categoria_id}`;
  const nombres = pareja.jugadores.map((j) => j.nombre).join(' / ');

  // El partido de esta semana, si ya está armado: lo más importante que una pareja quiere ver al
  // entrar, así que se muestra hasta arriba (antes incluso de las estadísticas), no hay que
  // buscarlo ni bajar a la tabla de "Últimos partidos".
  const partidoActual = pareja.partidos.find((m) => m.estado === 'programado');
  const rivalActual = partidoActual
    ? partidoActual.retadora_id === pareja.id
      ? partidoActual.retada_nombres
      : partidoActual.retadora_nombres
    : null;
  const esRetadoraActual = partidoActual?.retadora_id === pareja.id;
  const telefonoRival = partidoActual
    ? partidoActual.retadora_id === pareja.id
      ? partidoActual.retada_telefono
      : partidoActual.retadora_telefono
    : null;
  const fechaJuego = partidoActual?.fecha_juego
    ? new Date(partidoActual.fecha_juego).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      })
    : null;

  // Si esta semana ya se armaron los retos y a esta pareja no le tocó ninguno (es la sobrante de
  // su categoría, por número impar de parejas), se avisa explícitamente en vez de no mostrar nada
  // — así no parece que falta información.
  const jornadaActual = await getJornadaActual('America/Mazatlan').catch(() => null);
  const retosGenerados = jornadaActual ? await hayRetosGenerados(jornadaActual.id).catch(() => false) : false;
  const tieneAlgunPartidoEstaJornada = jornadaActual
    ? pareja.partidos.some((m) => m.jornada_id === jornadaActual.id)
    : true;
  const sinRetoEstaSemana = !!jornadaActual && retosGenerados && !tieneAlgunPartidoEstaJornada;

  return (
    <>
      <SiteHeader />
      <main style={{ paddingTop: 104 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: 700 }}>
            {/* Breadcrumb */}
            <nav style={{ marginBottom: 24, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              <Link href="/ranking" style={{ color: 'var(--color-accent)' }}>Ranking</Link>
              <span style={{ margin: '0 6px' }}>›</span>
              <span>{catNombre}</span>
            </nav>

            {/* Header */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {pareja.posicion != null && (
                  <span style={{
                    fontSize: '2rem', fontWeight: 900, color: 'var(--color-accent)',
                    lineHeight: 1, minWidth: 48, textAlign: 'center',
                  }}>
                    #{pareja.posicion}
                  </span>
                )}
                <div>
                  <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{nombres}</h1>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                    {catNombre}
                    {pareja.mixta && <span className="badge badge-mix" style={{ marginLeft: 8 }}>Mixta</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Partido de esta semana — lo primero que se ve, sin tener que buscarlo */}
            {partidoActual && rivalActual && (
              <div
                className="card"
                style={{
                  marginBottom: 24,
                  padding: 20,
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-border, var(--color-accent)))',
                  border: 'none',
                  color: 'var(--color-on-accent)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                    margin: '0 0 8px',
                  }}
                >
                  🏆 Tu partido de esta semana
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9 }}>
                    {esRetadoraActual ? 'Retas a' : 'Te reta'}
                  </span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{rivalActual}</span>
                </div>
                {telefonoRival && (
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 10px', opacity: 0.95 }}>
                    📞 {telefonoRival}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.22)',
                    }}
                  >
                    {partidoActual.tipo === 'ascenso' ? 'Ascenso' : 'Reto'}
                  </span>
                  {fechaJuego ? (
                    <span style={{ fontSize: '0.82rem', opacity: 0.95 }}>
                      {fechaJuego}
                      {partidoActual.cancha ? ` · Cancha ${partidoActual.cancha}` : ''}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                      Pónganse de acuerdo directamente con su rival para la fecha
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Esta semana no le tocó reto a esta pareja (sobrante de su categoría) */}
            {sinRetoEstaSemana && (
              <div
                className="card"
                style={{
                  marginBottom: 24,
                  padding: 20,
                  background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-border, var(--color-accent)))',
                  border: 'none',
                  color: 'var(--color-on-accent)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                    margin: '0 0 8px',
                  }}
                >
                  Esta semana
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                  Esta semana no tienes reto asignado. No afecta tu posición: la conservas igual.
                </p>
              </div>
            )}

            {/* Estadísticas */}
            <div className="stats-card">
              <div className="stats-card__head">
                <span className="stats-card__title">Estadísticas</span>
              </div>
              <div className="stats-grid">
                <div className="stat-tile">
                  <p className="stat-tile__value">{pareja.estadisticas.jugados}</p>
                  <p className="stat-tile__label">Jugados</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-tile__value stat-tile__value--win">{pareja.estadisticas.ganados}</p>
                  <p className="stat-tile__label">Ganados</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-tile__value stat-tile__value--loss">{pareja.estadisticas.perdidos}</p>
                  <p className="stat-tile__label">Perdidos</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-tile__value stat-tile__value--accent">{pareja.estadisticas.efectividad}%</p>
                  <p className="stat-tile__label">Efectividad</p>
                </div>
              </div>
              {pareja.estadisticas.racha >= 2 && (
                <div className="streak-banner streak-banner--win">
                  <span className="streak-banner__icon">🔥</span>
                  <span>¡Racha de {pareja.estadisticas.racha} victorias seguidas!</span>
                </div>
              )}
              {pareja.estadisticas.racha <= -2 && (
                <div className="streak-banner streak-banner--loss">
                  <span className="streak-banner__icon">📉</span>
                  <span>{Math.abs(pareja.estadisticas.racha)} derrotas seguidas</span>
                </div>
              )}
            </div>

            {/* Jugadores */}
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Jugadores</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 32 }}>
              {pareja.jugadores.map((j) => (
                <div key={j.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {j.tiene_foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/foto/${j.id}`}
                        alt={j.nombre}
                        width={48}
                        height={48}
                        style={{ borderRadius: '50%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--color-bg-alt)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-muted)',
                      }}>
                        {j.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{j.nombre}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        {j.genero === 'M' ? 'Hombre' : 'Mujer'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Partidos */}
            {pareja.partidos.length > 0 && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Últimos partidos</h2>
                <div className="match-list" style={{ marginBottom: 32 }}>
                  {pareja.partidos.map((m) => {
                    const esRetadora = m.retadora_id === pareja.id;
                    const rival = esRetadora ? m.retada_nombres : m.retadora_nombres;
                    const gano = m.ganadora_id === pareja.id;
                    const jugado = m.estado === 'jugado';
                    const sets = Array.isArray(m.sets) ? (m.sets as { a: number; b: number }[]) : [];
                    return (
                      <div
                        key={m.id}
                        className={`match-card ${jugado ? (gano ? 'match-card--win' : 'match-card--loss') : ''}`}
                      >
                        <span
                          className={`match-card__type match-card__type--${m.tipo === 'ascenso' ? 'ascenso' : 'reto'}`}
                        >
                          {m.tipo === 'ascenso' ? 'Ascenso' : 'Reto'}
                        </span>
                        <div className="match-card__main">
                          <p className="match-card__rival-label">Rival</p>
                          <p className="match-card__rival-name">{rival}</p>
                        </div>
                        <div className="match-card__result">
                          {jugado ? (
                            <>
                              <span className={`match-card__verdict match-card__verdict--${gano ? 'win' : 'loss'}`}>
                                {gano ? 'Ganó' : 'Perdió'}
                              </span>
                              {sets.length > 0 && (
                                <div className="match-card__sets">
                                  {sets.map((s, i) => (
                                    <span key={i} className="score-chip">
                                      {esRetadora ? `${s.a}-${s.b}` : `${s.b}-${s.a}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="match-card__verdict match-card__verdict--pending">{m.estado}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Movimientos */}
            {pareja.movimientos.length > 0 && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Historial de movimientos</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="ranking-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Motivo</th>
                        <th>Posición</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pareja.movimientos.map((mv) => (
                        <tr key={mv.id}>
                          <td>{mv.motivo}</td>
                          <td>
                            {mv.pos_antes != null && mv.pos_despues != null
                              ? `${mv.pos_antes} → ${mv.pos_despues}`
                              : mv.pos_despues ?? '—'}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(mv.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Back link */}
            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <Link href="/ranking" className="btn btn-secondary">
                ← Volver al ranking
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
