import { requireAdminPage } from '@/lib/auth-page';
import { adminGetCampeones, getCategorias } from '@/lib/queries';
import CampeonesClient from './CampeonesClient';

export const metadata = { title: 'Premio al campeón' };
export const dynamic = 'force-dynamic';

export default async function CampeonesPage() {
  await requireAdminPage();
  const [campeones, categorias] = await Promise.all([adminGetCampeones(), getCategorias()]);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Premio al campeón</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
        La pareja en 1er lugar de cada categoría no paga inscripción en el siguiente ranking, pero
        solo si se vuelve a inscribir con exactamente los mismos dos jugadores (no aplica si uno de
        ellos cambia de pareja). El sistema lo hace solo: cuando esos mismos jugadores se vuelvan a
        inscribir, la página pública les cobrará $0 automáticamente, sin que nadie tenga que
        acordarse. Aquí puedes registrar a los campeones de esta temporada con un botón, revisar
        quién está registrado, agregar un caso especial a mano o quitar un registro si ya no aplica.
      </p>
      <CampeonesClient campeones={campeones} categorias={categorias} />
    </div>
  );
}
