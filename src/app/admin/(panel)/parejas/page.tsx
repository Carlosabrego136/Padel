import Link from 'next/link';
import { adminGetParejas } from '@/lib/queries';
import { requireAdminPage } from '@/lib/auth-page';
import { getCategorias } from '@/lib/queries';

export const metadata = { title: 'Parejas' };
export const dynamic = 'force-dynamic';

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'badge-pendiente',
  aprobada: 'badge-aprobada',
  rechazada: 'badge-rechazada',
  retirada: 'badge-retirada',
};

export default async function ParejasPage({
  searchParams,
}: {
  searchParams: { categoria?: string; estado?: string };
}) {
  await requireAdminPage();

  const categoriaId = searchParams.categoria ? parseInt(searchParams.categoria, 10) : undefined;
  const estado = searchParams.estado || undefined;
  const [parejas, categorias] = await Promise.all([
    adminGetParejas(categoriaId, estado),
    getCategorias(),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Parejas</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
        Aquí ves todas las parejas inscritas. Toca una pareja para ver su detalle, aprobarla, rechazarla o editar sus
        datos. Las parejas &quot;pendientes&quot; aún no aparecen en el ranking público hasta que las apruebes.
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterLink href="/admin/parejas" label="Todas" active={!categoriaId && !estado} />
        <FilterLink href="/admin/parejas?estado=pendiente" label="Pendientes" active={estado === 'pendiente'} />
        <FilterLink href="/admin/parejas?estado=aprobada" label="Aprobadas" active={estado === 'aprobada'} />
        <FilterLink href="/admin/parejas?estado=rechazada" label="Rechazadas" active={estado === 'rechazada'} />
        <FilterLink href="/admin/parejas?estado=retirada" label="Retiradas" active={estado === 'retirada'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categorias.map((c) => (
          <FilterLink
            key={c.id}
            href={`/admin/parejas?categoria=${c.id}${estado ? `&estado=${estado}` : ''}`}
            label={c.nombre}
            active={categoriaId === c.id}
          />
        ))}
      </div>

      {parejas.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No hay parejas con estos filtros.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {parejas.map((p) => (
            <Link
              key={p.id}
              href={`/admin/parejas/${p.id}`}
              className="card"
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {p.jugadores.map((j) => j.nombre).join(' / ')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  {p.categoria_nombre} · Pos: {p.posicion ?? '—'} · Tel: {p.telefono_contacto}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {p.pago_confirmado && (
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: 'var(--color-success)', color: '#fff' }}>
                    Pagado
                  </span>
                )}
                <span className={ESTADO_BADGE[p.estado] ?? ''} style={{ fontSize: '0.8rem' }}>
                  {p.estado}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
    >
      {label}
    </Link>
  );
}
