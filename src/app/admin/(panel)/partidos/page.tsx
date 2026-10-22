import { requireAdminPage } from '@/lib/auth-page';
import { adminGetJornadas } from '@/lib/queries';
import PartidosClient from './PartidosClient';

export const metadata = { title: 'Partidos' };
export const dynamic = 'force-dynamic';

export default async function PartidosPage() {
  await requireAdminPage();
  const jornadas = await adminGetJornadas();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Partidos</h1>
      <PartidosClient jornadas={jornadas} />
    </div>
  );
}
