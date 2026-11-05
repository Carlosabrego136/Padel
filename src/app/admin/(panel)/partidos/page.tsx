import { requireAdminPage } from '@/lib/auth-page';
import { adminGetJornadas, getCategorias } from '@/lib/queries';
import PartidosClient from './PartidosClient';

export const metadata = { title: 'Partidos' };
export const dynamic = 'force-dynamic';

export default async function PartidosPage() {
  await requireAdminPage();
  const [jornadas, categorias] = await Promise.all([adminGetJornadas(), getCategorias()]);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Partidos</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
        Elige una jornada (semana) para ver los retos y ascensos programados. Desde aquí capturas el resultado de
        cada partido, resuelves uno sin jugar por falta de acuerdo, le asignas fecha/cancha, o lo cancelas.
      </p>
      <PartidosClient jornadas={jornadas} categorias={categorias} />
    </div>
  );
}
