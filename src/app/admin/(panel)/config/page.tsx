import { requireAdminPage } from '@/lib/auth-page';
import { adminGetConfig } from '@/lib/queries';
import ConfigClient from './ConfigClient';

export const metadata = { title: 'Configuración' };
export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  await requireAdminPage();
  const config = await adminGetConfig();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Configuración</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
        Parámetros generales del ranking. Los cambios quedan registrados en auditoría.
      </p>
      <ConfigClient config={config} />
    </div>
  );
}
