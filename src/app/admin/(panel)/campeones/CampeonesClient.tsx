'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CampeonRow, CategoriaRow } from '@/lib/queries';

interface Props {
  campeones: CampeonRow[];
  categorias: CategoriaRow[];
}

function fecha(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('es-MX');
}

export default function CampeonesClient({ campeones, categorias }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState<number>(categorias[0]?.id ?? 1);
  const [jugador1, setJugador1] = useState('');
  const [jugador2, setJugador2] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleRegistrar = useCallback(async () => {
    if (registrando) return;
    if (!confirm('¿Registrar como campeones a las parejas que están en 1er lugar de cada categoría en este momento?')) return;

    setError(null);
    setSuccess(null);
    setRegistrando(true);
    try {
      const res = await fetch('/api/admin/campeones/registrar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al registrar los campeones');
        return;
      }
      const n = data.resultado?.registrados ?? 0;
      setSuccess(n > 0 ? `Se registraron ${n} pareja(s) campeona(s).` : 'No hay parejas nuevas para registrar (puede que ya estuvieran registradas o que ninguna categoría tenga 1er lugar aún).');
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setRegistrando(false);
    }
  }, [registrando, router]);

  const handleAgregar = useCallback(async () => {
    if (guardando) return;
    setError(null);
    setSuccess(null);
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/campeones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaId, jugador1, jugador2 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al agregar el registro');
        return;
      }
      setSuccess('Registro agregado.');
      setJugador1('');
      setJugador2('');
      setFormOpen(false);
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  }, [guardando, categoriaId, jugador1, jugador2, router]);

  const handleEliminar = useCallback(
    async (id: string, j1: string, j2: string) => {
      if (eliminando) return;
      if (!confirm(`¿Quitar el registro de campeón de ${j1} / ${j2}? Si aún no se usa, dejarán de tener la inscripción gratis.`)) return;

      setError(null);
      setSuccess(null);
      setEliminando(id);
      try {
        const res = await fetch(`/api/admin/campeones/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Error al eliminar');
          return;
        }
        setSuccess('Registro eliminado.');
        router.refresh();
      } catch {
        setError('Error de conexión');
      } finally {
        setEliminando(null);
      }
    },
    [eliminando, router],
  );

  return (
    <div>
      {error && <div className="toast toast-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="toast toast-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleRegistrar} disabled={registrando}>
          {registrando ? 'Registrando…' : 'Registrar campeones de esta temporada'}
        </button>
        <button className="btn btn-secondary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? 'Cancelar' : 'Agregar manualmente'}
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 480 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Agregar registro manual</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: '0.85rem' }}>
              Categoría
              <select
                className="input"
                value={categoriaId}
                onChange={(e) => setCategoriaId(parseInt(e.target.value, 10))}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: '0.85rem' }}>
              Nombre del jugador 1
              <input
                className="input"
                value={jugador1}
                onChange={(e) => setJugador1(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
            <label style={{ fontSize: '0.85rem' }}>
              Nombre del jugador 2
              <input
                className="input"
                value={jugador2}
                onChange={(e) => setJugador2(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={handleAgregar}
              disabled={guardando || jugador1.trim().length < 3 || jugador2.trim().length < 3}
            >
              {guardando ? 'Guardando…' : 'Guardar registro'}
            </button>
          </div>
        </div>
      )}

      {campeones.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay campeones registrados.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ranking-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Pareja campeona</th>
                <th>Temporada</th>
                <th>Estado</th>
                <th>Registrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campeones.map((c) => (
                <tr key={c.id}>
                  <td>{c.categoria_nombre}</td>
                  <td>{c.jugador1_nombre} / {c.jugador2_nombre}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{c.temporada}</td>
                  <td>
                    {c.usado ? (
                      <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 4, background: 'var(--color-success)', color: '#fff' }}>
                        Ya se inscribieron gratis {c.usado_en ? `(${fecha(c.usado_en)})` : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff' }}>
                        Pendiente de usar
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{fecha(c.creado_en)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEliminar(c.id, c.jugador1_nombre, c.jugador2_nombre)}
                      disabled={eliminando === c.id}
                    >
                      {eliminando === c.id ? 'Quitando…' : 'Quitar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
