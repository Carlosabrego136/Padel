import { adminGetDashboard } from '@/lib/queries';
import { requireAdminPage } from '@/lib/auth-page';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireAdminPage();
  const data = await adminGetDashboard();

  const totalParejas = data.parejas_por_estado.reduce((s, r) => s + r.total, 0);

  const parejasPendientes = data.parejas_por_estado.find((r) => r.estado === 'pendiente')?.total ?? 0;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
        Resumen general del ranking. Aquí ves de un vistazo cuántas parejas hay, cuántas esperan tu aprobación y en qué semana (jornada) va el ranking.
      </p>

      {parejasPendientes > 0 && (
        <div
          className="card"
          style={{ padding: 16, marginBottom: 20, borderLeft: '4px solid var(--color-accent)', background: 'var(--color-bg-alt)' }}
        >
          <strong style={{ fontSize: '0.9rem' }}>
            Tienes {parejasPendientes} {parejasPendientes === 1 ? 'pareja pendiente' : 'parejas pendientes'} de aprobar.
          </strong>{' '}
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Ve a &quot;Parejas&quot; → &quot;Pendientes&quot; para revisarlas y aprobarlas o rechazarlas.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Parejas totales"
          value={totalParejas}
          help="Todas las parejas inscritas, sin importar su estado (aprobadas, pendientes, rechazadas o retiradas)."
        />
        <StatCard
          label="Jugadores activos"
          value={data.total_jugadores}
          help="Jugadores que forman parte de una pareja ya aprobada."
        />
        <StatCard
          label="Jornadas"
          value={`${data.jornadas_cerradas} / ${data.jornadas_total}`}
          help="Jornadas (semanas) ya cerradas, de las programadas en total."
        />
        {data.parejas_por_estado.map((r) => (
          <StatCard
            key={r.estado}
            label={`Parejas ${r.estado}s`}
            value={r.total}
            help={ESTADO_AYUDA[r.estado]}
          />
        ))}
      </div>

      {data.proxima_jornada && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Jornada actual</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Jornada #{data.proxima_jornada.numero ?? '—'} · Estado: {data.proxima_jornada.estado}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            {new Date(data.proxima_jornada.inicio).toLocaleDateString('es-MX')} –{' '}
            {new Date(data.proxima_jornada.cierre).toLocaleDateString('es-MX')}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
            La jornada es la semana en la que las parejas juegan sus retos. Se cierra sola cuando llega su fecha de
            cierre y el ranking se actualiza automáticamente; también puedes cerrarla manualmente desde
            &quot;Jornadas&quot; si ya se jugaron todos los partidos.
          </p>
        </div>
      )}
    </div>
  );
}

const ESTADO_AYUDA: Record<string, string> = {
  pendiente: 'Esperan tu revisión para aprobarse o rechazarse. No aparecen en el ranking público todavía.',
  aprobada: 'Ya confirmadas por el club. Participan en el ranking (una vez que tengan posición asignada).',
  rechazada: 'No fueron aceptadas. No aparecen en el ranking.',
  retirada: 'Salieron del ranking por su propia decisión o por indicación del club. Su historial se conserva.',
};

function StatCard({ label, value, help }: { label: string; value: string | number; help?: string }) {
  return (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
      {help && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>
          {help}
        </div>
      )}
    </div>
  );
}
