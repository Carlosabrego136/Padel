import { requireAdminPage } from '@/lib/auth-page';
import { adminGetJornadas } from '@/lib/queries';
import JornadasClient from './JornadasClient';

export const metadata = { title: 'Jornadas' };
export const dynamic = 'force-dynamic';

export default async function JornadasPage() {
  await requireAdminPage();
  const jornadas = await adminGetJornadas();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Jornadas</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
        Cada jornada es una semana del ranking (martes a lunes), donde las parejas juegan sus retos. Se cierra sola
        automáticamente cuando llega su fecha de cierre, pero también puedes cerrarla tú manualmente antes de tiempo
        si ya se jugaron todos los partidos — al cerrarla se procesan los resultados y se actualizan las posiciones.
      </p>
      <JornadasClient jornadas={jornadas} />
    </div>
  );
}
