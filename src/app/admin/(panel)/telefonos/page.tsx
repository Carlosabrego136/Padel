import { adminGetParejas } from '@/lib/queries';
import { requireAdminPage } from '@/lib/auth-page';
import TelefonosClient, { type ContactoTelefono } from './TelefonosClient';

export const metadata = { title: 'Teléfonos' };
export const dynamic = 'force-dynamic';

export default async function TelefonosPage() {
  await requireAdminPage();

  const parejas = await adminGetParejas(undefined, 'aprobada');

  // Aplanamos: un renglón por jugador, con su propio teléfono o, si no lo capturó,
  // el teléfono de contacto de su pareja (así nunca queda nadie sin número).
  const grupos = new Map<string, ContactoTelefono[]>();
  for (const p of parejas) {
    const arr = grupos.get(p.categoria_nombre) ?? [];
    for (const j of p.jugadores) {
      arr.push({
        nombre: j.nombre,
        telefono: j.telefono || p.telefono_contacto,
        parejaId: p.id,
      });
    }
    grupos.set(p.categoria_nombre, arr);
  }

  const categorias = Array.from(grupos.entries())
    .map(([categoria, contactos]) => ({
      categoria,
      contactos: contactos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));

  const total = categorias.reduce((n, c) => n + c.contactos.length, 0);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Teléfonos</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
        Lista de todos los jugadores aprobados con su teléfono, agrupados por categoría — para armar los
        chats de WhatsApp sin tener que entrar pareja por pareja.
      </p>

      {total === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay parejas aprobadas.</p>
      ) : (
        <TelefonosClient categorias={categorias} />
      )}
    </div>
  );
}
