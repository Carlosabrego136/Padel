import { adminGetDashboard } from '@/lib/queries';
import { requireAdminPage } from '@/lib/auth-page';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireAdminPage();
  const data = await adminGetDashboard();

  const totalParejas = data.parejas_por_estado.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Parejas totales" value={totalParejas} />
        <StatCard label="Jugadores activos" value={data.total_jugadores} />
        <StatCard label="Jornadas" value={`${data.jornadas_cerradas} / ${data.jornadas_total}`} />
        {data.parejas_por_estado.map((r) => (
          <StatCard key={r.estado} label={`Parejas ${r.estado}s`} value={r.total} />
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
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
