import { requireAdminPage } from '@/lib/auth-page';
import { adminGetAuditLog, adminGetAuditCambios } from '@/lib/queries';

export const metadata = { title: 'Auditoría' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function fecha(ts: string): string {
  return new Date(ts).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function resumen(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  try {
    const s = typeof valor === 'string' ? valor : JSON.stringify(valor);
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  } catch {
    return '—';
  }
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; entidad?: string; tabla?: string };
}) {
  await requireAdminPage();

  const tab = searchParams.tab === 'cambios' ? 'cambios' : 'log';
  const pageNum = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const logData =
    tab === 'log'
      ? await adminGetAuditLog({ limit: PAGE_SIZE, offset, entidad: searchParams.entidad })
      : null;
  const cambiosData =
    tab === 'cambios'
      ? await adminGetAuditCambios({ limit: PAGE_SIZE, offset, tabla: searchParams.tabla })
      : null;

  const total = logData?.total ?? cambiosData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Auditoría</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
        Registro de acciones administrativas y cambios automáticos en la base de datos.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <a
          href="/admin/auditoria?tab=log"
          className={`btn btn-sm ${tab === 'log' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Acciones administrativas
        </a>
        <a
          href="/admin/auditoria?tab=cambios"
          className={`btn btn-sm ${tab === 'cambios' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Cambios en base de datos
        </a>
      </div>

      {tab === 'log' && logData && (
        <div style={{ overflowX: 'auto' }}>
          <table className="ranking-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Detalle</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logData.rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Sin registros.</td></tr>
              ) : (
                logData.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fecha(r.ts)}</td>
                    <td>{r.actor}</td>
                    <td><span className="badge">{r.accion}</span></td>
                    <td>
                      {r.entidad}
                      {r.entidad_id && (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {' '}#{r.entidad_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td>{r.detalle ?? '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{r.ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cambios' && cambiosData && (
        <div style={{ overflowX: 'auto' }}>
          <table className="ranking-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Tabla</th>
                <th>Operación</th>
                <th>Antes</th>
                <th>Después</th>
              </tr>
            </thead>
            <tbody>
              {cambiosData.rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Sin registros.</td></tr>
              ) : (
                cambiosData.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{fecha(r.ts)}</td>
                    <td>{r.actor}</td>
                    <td>{r.tabla}</td>
                    <td><span className="badge">{r.operacion}</span></td>
                    <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{resumen(r.antes)}</td>
                    <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{resumen(r.despues)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
          {pageNum > 1 && (
            <a className="btn btn-sm btn-secondary" href={`/admin/auditoria?tab=${tab}&page=${pageNum - 1}`}>
              Anterior
            </a>
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Página {pageNum} de {totalPages}
          </span>
          {pageNum < totalPages && (
            <a className="btn btn-sm btn-secondary" href={`/admin/auditoria?tab=${tab}&page=${pageNum + 1}`}>
              Siguiente
            </a>
          )}
        </div>
      )}
    </div>
  );
}
