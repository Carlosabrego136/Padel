import { requireAdminPage } from '@/lib/auth-page';
import { getCategorias } from '@/lib/queries';
import SorteoClient from './SorteoClient';

export const metadata = { title: 'Sorteo' };
export const dynamic = 'force-dynamic';

export default async function SorteoPage() {
  await requireAdminPage();
  const categorias = await getCategorias();

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Sorteo de posiciones</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
        El sorteo asigna posiciones aleatorias a las parejas aprobadas de una categoría. Solo se puede hacer una vez por categoría.
      </p>
      <SorteoClient categorias={categorias} />
    </div>
  );
}
