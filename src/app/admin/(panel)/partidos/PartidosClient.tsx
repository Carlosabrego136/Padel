'use client';

import { useState, useEffect, useCallback } from 'react';
import type { JornadaRow, PartidoConNombres } from '@/lib/queries';

interface Props {
  jornadas: JornadaRow[];
}

type ModalType = 'resultado' | 'resolver' | 'programar' | 'cancelar' | null;

export default function PartidosClient({ jornadas }: Props) {
  const [jornadaId, setJornadaId] = useState<number | null>(() => {
    const programada = jornadas.find((j) => j.estado === 'programada' && j.tipo === 'normal');
    return programada?.id ?? jornadas[jornadas.length - 1]?.id ?? null;
  });

  const [partidos, setPartidos] = useState<PartidoConNombres[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedPartido, setSelectedPartido] = useState<PartidoConNombres | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [sets, setSets] = useState([{ a: 0, b: 0 }, { a: 0, b: 0 }, { a: 0, b: 0 }]);
  const [ganadoraId, setGanadoraId] = useState('');
  const [nota, setNota] = useState('');
  const [fechaJuego, setFechaJuego] = useState('');
  const [cancha, setCancha] = useState('');
  const [motivo, setMotivo] = useState('');

  const fetchPartidos = useCallback(async () => {
    if (!jornadaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jornadas/${jornadaId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Error al cargar partidos');
      }
      const data = await res.json();
      setPartidos(Array.isArray(data) ? data : data.partidos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [jornadaId]);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  const openModal = (type: ModalType, p: PartidoConNombres) => {
    setSelectedPartido(p);
    setModal(type);
    setError(null);
    setSuccess(null);
    setSets([{ a: 0, b: 0 }, { a: 0, b: 0 }, { a: 0, b: 0 }]);
    setGanadoraId('');
    setNota('');
    setFechaJuego(p.fecha_juego ? new Date(p.fecha_juego).toISOString().slice(0, 16) : '');
    setCancha(p.cancha?.toString() ?? '');
    setMotivo('');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedPartido(null);
  };

  const submitAction = async (url: string, method: string, body: unknown) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error en la operación');
        return;
      }
      setSuccess('Operación exitosa');
      closeModal();
      fetchPartidos();
    } catch {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultado = () => {
    if (!selectedPartido) return;
    const validSets = sets.filter((s) => s.a > 0 || s.b > 0);
    if (validSets.length < 2) {
      setError('Captura al menos 2 sets');
      return;
    }
    submitAction(`/api/admin/partidos/${selectedPartido.id}/resultado`, 'POST', { sets: validSets });
  };

  const handleResolver = () => {
    if (!selectedPartido || !ganadoraId || nota.trim().length < 10) {
      setError('Selecciona la ganadora y escribe una nota (mínimo 10 caracteres)');
      return;
    }
    submitAction(`/api/admin/partidos/${selectedPartido.id}/resolver`, 'POST', { ganadoraId, nota: nota.trim() });
  };

  const handleProgramar = () => {
    if (!selectedPartido) return;
    submitAction(`/api/admin/partidos/${selectedPartido.id}/programar`, 'PUT', {
      fechaJuego: fechaJuego || undefined,
      cancha: cancha ? parseInt(cancha, 10) : undefined,
    });
  };

  const handleCancelar = () => {
    if (!selectedPartido || motivo.trim().length < 5) {
      setError('Escribe el motivo (mínimo 5 caracteres)');
      return;
    }
    submitAction(`/api/admin/partidos/${selectedPartido.id}/cancelar`, 'POST', { motivo: motivo.trim() });
  };

  return (
    <div>
      {/* Selector de jornada */}
      <div className="form-group" style={{ maxWidth: 300, marginBottom: 20 }}>
        <label className="form-label">Jornada</label>
        <select
          className="form-input"
          value={jornadaId ?? ''}
          onChange={(e) => setJornadaId(e.target.value ? parseInt(e.target.value, 10) : null)}
        >
          <option value="">Seleccionar jornada</option>
          {jornadas.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.numero ?? j.id} — {j.estado} ({new Date(j.inicio).toLocaleDateString('es-MX')})
            </option>
          ))}
        </select>
      </div>

      {error && <div className="toast toast-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="toast toast-success" style={{ marginBottom: 16 }}>{success}</div>}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando partidos…</p>
      ) : partidos.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No hay partidos en esta jornada.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ranking-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Retadora</th>
                <th>Retada</th>
                <th>Estado</th>
                <th>Marcador</th>
                <th>Cancha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {partidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: p.tipo === 'ascenso' ? 'var(--color-accent)' : 'var(--color-bg-alt)',
                      color: p.tipo === 'ascenso' ? '#fff' : 'var(--color-text)',
                    }}>
                      {p.tipo}
                    </span>
                  </td>
                  <td>{p.retadora_nombres} <span style={{ color: 'var(--color-text-muted)' }}>#{p.pos_retadora}</span></td>
                  <td>{p.retada_nombres} <span style={{ color: 'var(--color-text-muted)' }}>#{p.pos_retada}</span></td>
                  <td>{p.estado}</td>
                  <td>
                    {p.sets
                      ? (p.sets as { a: number; b: number }[]).map((s) => `${s.a}-${s.b}`).join(', ')
                      : '—'}
                  </td>
                  <td>{p.cancha ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.estado === 'programado' && (
                        <>
                          <Btn label="Resultado" onClick={() => openModal('resultado', p)} />
                          <Btn label="Resolver" onClick={() => openModal('resolver', p)} />
                          <Btn label="Programar" onClick={() => openModal('programar', p)} />
                          <Btn label="Cancelar" onClick={() => openModal('cancelar', p)} danger />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal overlay */}
      {modal && selectedPartido && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, textTransform: 'capitalize' }}>
              {modal} — {selectedPartido.retadora_nombres} vs {selectedPartido.retada_nombres}
            </h3>

            {error && <div className="toast toast-error" style={{ marginBottom: 12 }}>{error}</div>}

            {modal === 'resultado' && (
              <>
                {sets.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.85rem', width: 50 }}>Set {i + 1}:</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="form-input"
                      style={{ width: 60 }}
                      value={s.a}
                      onChange={(e) => {
                        const v = [...sets];
                        v[i] = { ...v[i], a: parseInt(e.target.value) || 0 };
                        setSets(v);
                      }}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      className="form-input"
                      style={{ width: 60 }}
                      value={s.b}
                      onChange={(e) => {
                        const v = [...sets];
                        v[i] = { ...v[i], b: parseInt(e.target.value) || 0 };
                        setSets(v);
                      }}
                    />
                  </div>
                ))}
                <ModalActions onConfirm={handleResultado} onCancel={closeModal} loading={submitting} />
              </>
            )}

            {modal === 'resolver' && (
              <>
                <div className="form-group">
                  <label className="form-label">Ganadora</label>
                  <select className="form-input" value={ganadoraId} onChange={(e) => setGanadoraId(e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value={selectedPartido.retadora_id}>{selectedPartido.retadora_nombres}</option>
                    <option value={selectedPartido.retada_id}>{selectedPartido.retada_nombres}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nota (mínimo 10 caracteres)</label>
                  <textarea className="form-input" rows={3} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
                </div>
                <ModalActions onConfirm={handleResolver} onCancel={closeModal} loading={submitting} />
              </>
            )}

            {modal === 'programar' && (
              <>
                <div className="form-group">
                  <label className="form-label">Fecha y hora</label>
                  <input type="datetime-local" className="form-input" value={fechaJuego} onChange={(e) => setFechaJuego(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cancha (1-12)</label>
                  <input type="number" min={1} max={12} className="form-input" value={cancha} onChange={(e) => setCancha(e.target.value)} />
                </div>
                <ModalActions onConfirm={handleProgramar} onCancel={closeModal} loading={submitting} />
              </>
            )}

            {modal === 'cancelar' && (
              <>
                <div className="form-group">
                  <label className="form-label">Motivo (mínimo 5 caracteres)</label>
                  <textarea className="form-input" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
                <ModalActions onConfirm={handleCancelar} onCancel={closeModal} loading={submitting} confirmLabel="Cancelar partido" danger />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`btn ${danger ? 'btn-danger' : 'btn-secondary'}`}
      onClick={onClick}
      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
    >
      {label}
    </button>
  );
}

function ModalActions({
  onConfirm,
  onCancel,
  loading,
  confirmLabel = 'Confirmar',
  danger,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
        {loading ? 'Procesando…' : confirmLabel}
      </button>
      <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
        Cerrar
      </button>
    </div>
  );
}
