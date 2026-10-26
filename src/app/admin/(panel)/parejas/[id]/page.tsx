import { notFound } from 'next/navigation';
import { adminGetPareja } from '@/lib/queries';
import { requireAdminPage } from '@/lib/auth-page';
import ParejaActions from './ParejaActions';
import FotoJugadorUpload from './FotoJugadorUpload';

export const metadata = { title: 'Detalle de pareja' };
export const dynamic = 'force-dynamic';

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'badge-pendiente',
  aprobada: 'badge-aprobada',
  rechazada: 'badge-rechazada',
  retirada: 'badge-retirada',
};

export default async function ParejaDetallePage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const pareja = await adminGetPareja(params.id);
  if (!pareja) notFound();

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>
        {pareja.jugadores.map((j) => j.nombre).join(' / ')}
      </h1>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Info label="Categoría" value={pareja.categoria_nombre} />
          <Info label="Estado">
            <span className={ESTADO_BADGE[pareja.estado]}>{pareja.estado}</span>
          </Info>
          <Info label="Posición" value={pareja.posicion != null ? `#${pareja.posicion}` : 'Sin posición'} />
          {pareja.posicion == null && pareja.estado === 'aprobada' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                Esta pareja está aprobada pero todavía no tiene lugar en el ranking: falta hacer el{' '}
                <strong>sorteo inicial</strong> de su categoría (&quot;{pareja.categoria_nombre}&quot;). Ve a la
                sección &quot;Sorteo&quot; en el menú para asignarle su posición.
              </p>
            </div>
          )}
          <Info label="Teléfono contacto" value={pareja.telefono_contacto} />
          <Info label="Cuota/jugador" value={`$${pareja.cuota_por_jugador}`} />
          <Info label="Pago" value={pareja.pago_confirmado ? 'Confirmado' : 'Pendiente'} />
          <Info label="Creada" value={new Date(pareja.creada_en).toLocaleDateString('es-MX')} />
          {pareja.aprobada_en && (
            <Info label="Aprobada" value={new Date(pareja.aprobada_en).toLocaleDateString('es-MX')} />
          )}
          {pareja.retirada_en && (
            <Info label="Retirada" value={new Date(pareja.retirada_en).toLocaleDateString('es-MX')} />
          )}
          {pareja.motivo_cierre && <Info label="Motivo" value={pareja.motivo_cierre} />}
        </div>
      </div>

      {/* Jugadores */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Jugadores</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Si un jugador no subió su foto al inscribirse, pueden agregársela aquí manualmente.
        </p>
        {pareja.jugadores.map((j) => (
          <div
            key={j.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 12,
              fontSize: '0.9rem',
            }}
          >
            <div>
              <strong>{j.nombre}</strong>{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>
                ({j.genero === 'M' ? 'Hombre' : 'Mujer'})
                {j.telefono ? ` · ${j.telefono}` : ''}
              </span>
            </div>
            <FotoJugadorUpload jugadorId={j.id} nombre={j.nombre} tieneFoto={j.tiene_foto} />
          </div>
        ))}
      </div>

      {/* Acciones */}
      <ParejaActions pareja={pareja} />

      {/* Partidos */}
      {pareja.partidos.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Partidos</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Historial de retos y ascensos de esta pareja. Para capturar un resultado o resolver un partido, ve a la
            sección &quot;Partidos&quot; del menú.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="ranking-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Retadora</th>
                  <th>vs</th>
                  <th>Estado</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pareja.partidos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.tipo}</td>
                    <td>{p.retadora_nombres}</td>
                    <td>{p.retada_nombres}</td>
                    <td>{p.estado}</td>
                    <td>
                      {p.sets
                        ? (p.sets as { a: number; b: number }[]).map((s) => `${s.a}-${s.b}`).join(', ')
                        : '—'}
                    </td>
                    <td>{p.fecha_juego ? new Date(p.fecha_juego).toLocaleDateString('es-MX') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movimientos */}
      {pareja.movimientos.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Movimientos</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Cada vez que esta pareja sube, baja, asciende de categoría o se mueve por otro motivo, queda un
            registro aquí con su posición antes y después.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="ranking-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Motivo</th>
                  <th>Antes</th>
                  <th>Después</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {pareja.movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{m.motivo}</td>
                    <td>{m.pos_antes != null ? `Cat${m.categoria_antes} #${m.pos_antes}` : '—'}</td>
                    <td>{m.pos_despues != null ? `Cat${m.categoria_despues} #${m.pos_despues}` : '—'}</td>
                    <td>{new Date(m.creado_en).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{children ?? value}</div>
    </div>
  );
}
