'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ParejaAdminDetalle } from '@/lib/queries';

interface Props {
  pareja: ParejaAdminDetalle;
}

const MAX_RETRIES = 0; // acciones admin no se reintentan automáticamente

export default function ParejaActions({ pareja }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [showMotivo, setShowMotivo] = useState<'rechazar' | 'retirar' | 'eliminar' | null>(null);
  const [showEditar, setShowEditar] = useState(false);

  const [editData, setEditData] = useState({
    telefonoContacto: pareja.telefono_contacto,
    jugador1: {
      nombre: pareja.jugadores[0]?.nombre ?? '',
      genero: (pareja.jugadores[0]?.genero ?? 'M') as 'M' | 'F',
      telefono: pareja.jugadores[0]?.telefono ?? '',
    },
    jugador2: {
      nombre: pareja.jugadores[1]?.nombre ?? '',
      genero: (pareja.jugadores[1]?.genero ?? 'M') as 'M' | 'F',
      telefono: pareja.jugadores[1]?.telefono ?? '',
    },
  });

  const apiCall = useCallback(
    async (url: string, method: string, body?: unknown) => {
      setError(null);
      setLoading(url);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Error en la operación');
          return false;
        }
        router.refresh();
        return true;
      } catch {
        setError('Error de conexión');
        return false;
      } finally {
        setLoading(null);
      }
    },
    [router],
  );

  const handleAprobar = () => apiCall(`/api/admin/parejas/${pareja.id}/aprobar`, 'POST', { pagoConfirmado: true });

  const handleMotivoSubmit = async () => {
    if (motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }
    let url = '';
    let method = 'POST';
    if (showMotivo === 'rechazar') url = `/api/admin/parejas/${pareja.id}/rechazar`;
    else if (showMotivo === 'retirar') url = `/api/admin/parejas/${pareja.id}/retirar`;
    else if (showMotivo === 'eliminar') {
      url = `/api/admin/parejas/${pareja.id}/eliminar`;
      method = 'DELETE';
    }
    const ok = await apiCall(url, method, { motivo: motivo.trim() });
    if (ok) {
      setMotivo('');
      setShowMotivo(null);
    }
  };

  const handleEditar = async () => {
    const ok = await apiCall(`/api/admin/parejas/${pareja.id}/editar`, 'PUT', editData);
    if (ok) setShowEditar(false);
  };

  const isLoading = loading !== null;

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Acciones</h2>

      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {pareja.estado === 'pendiente' && (
          <>
            <button className="btn btn-primary" onClick={handleAprobar} disabled={isLoading}>
              {loading?.includes('aprobar') ? 'Aprobando…' : 'Aprobar'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => { setShowMotivo('rechazar'); setShowEditar(false); }}
              disabled={isLoading}
            >
              Rechazar
            </button>
          </>
        )}
        {pareja.estado === 'aprobada' && (
          <button
            className="btn btn-danger"
            onClick={() => { setShowMotivo('retirar'); setShowEditar(false); }}
            disabled={isLoading}
          >
            Retirar
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => { setShowEditar((v) => !v); setShowMotivo(null); }}
          disabled={isLoading}
        >
          Editar datos
        </button>
        <button
          className="btn btn-danger"
          onClick={() => { setShowMotivo('eliminar'); setShowEditar(false); }}
          disabled={isLoading}
        >
          Eliminar
        </button>
      </div>

      {/* Formulario de motivo */}
      {showMotivo && (
        <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-bg-alt)', borderRadius: 8 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, textTransform: 'capitalize' }}>
            {showMotivo} pareja
          </h3>
          <div className="form-group">
            <label className="form-label" htmlFor="motivo">Motivo</label>
            <textarea
              id="motivo"
              className="form-input"
              rows={3}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica el motivo (mínimo 5 caracteres)"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={handleMotivoSubmit} disabled={isLoading}>
              Confirmar
            </button>
            <button className="btn btn-secondary" onClick={() => setShowMotivo(null)} disabled={isLoading}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de edición */}
      {showEditar && (
        <div style={{ padding: 16, background: 'var(--color-bg-alt)', borderRadius: 8 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Editar datos</h3>

          <div className="form-group">
            <label className="form-label">Teléfono de contacto</label>
            <input
              className="form-input"
              value={editData.telefonoContacto}
              onChange={(e) => setEditData((d) => ({ ...d, telefonoContacto: e.target.value }))}
              maxLength={15}
            />
          </div>

          {[0, 1].map((i) => {
            const key = i === 0 ? 'jugador1' : 'jugador2' as const;
            return (
              <fieldset key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <legend style={{ fontSize: '0.85rem', fontWeight: 600 }}>Jugador {i + 1}</legend>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    value={editData[key].nombre}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, [key]: { ...d[key], nombre: e.target.value } }))
                    }
                    maxLength={60}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Género</label>
                  <select
                    className="form-input"
                    value={editData[key].genero}
                    onChange={(e) =>
                      setEditData((d) => ({
                        ...d,
                        [key]: { ...d[key], genero: e.target.value as 'M' | 'F' },
                      }))
                    }
                  >
                    <option value="M">Hombre</option>
                    <option value="F">Mujer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono (opcional)</label>
                  <input
                    className="form-input"
                    value={editData[key].telefono}
                    onChange={(e) =>
                      setEditData((d) => ({ ...d, [key]: { ...d[key], telefono: e.target.value } }))
                    }
                    maxLength={15}
                  />
                </div>
              </fieldset>
            );
          })}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleEditar} disabled={isLoading}>
              {loading?.includes('editar') ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEditar(false)} disabled={isLoading}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
