'use client';

import { useState } from 'react';
import type { JornadaRow } from '@/lib/queries';

export default function JornadasClient({ jornadas: init }: { jornadas: JornadaRow[] }) {
  const [jornadas] = useState(init);
  const [closing, setClosing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleCerrar(jornadaId: number) {
    if (closing) return;
    if (!confirm('Cerrar la jornada procesará todos los resultados y movimientos del ranking. ¿Continuar?')) return;
    setClosing(jornadaId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/jornadas/${jornadaId}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setMessage({ text: 'Jornada cerrada exitosamente. Recarga para ver los cambios.', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Error', ok: false });
    } finally {
      setClosing(null);
    }
  }

  const estadoColor = (e: string) => {
    if (e === 'programada') return 'var(--color-success)';
    if (e === 'cerrada') return 'var(--color-text-muted)';
    return 'var(--color-warning)';
  };

  return (
    <div>
      {message && <div className={`toast ${message.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 16 }}>{message.text}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="ranking-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Inicio</th>
              <th>Cierre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jornadas.map((j) => (
              <tr key={j.id}>
                <td style={{ fontWeight: 600 }}>{j.numero}</td>
                <td>{new Date(j.inicio).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td>{new Date(j.cierre).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td>
                  <span style={{ color: estadoColor(j.estado), fontWeight: 500, fontSize: '0.85rem' }}>
                    {j.estado}
                  </span>
                </td>
                <td>
                  {j.estado === 'programada' && (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                      disabled={closing !== null}
                      onClick={() => handleCerrar(j.id)}
                    >
                      {closing === j.id ? 'Cerrando…' : 'Cerrar jornada'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
