'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoriaRow } from '@/lib/queries';

interface Props {
  categorias: CategoriaRow[];
}

export default function SorteoClient({ categorias }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSorteo = useCallback(
    async (categoriaId: number, nombre: string) => {
      if (loading !== null) return;
      if (!confirm(`¿Realizar el sorteo de posiciones para ${nombre}? Esta acción no se puede deshacer.`)) return;

      setError(null);
      setSuccess(null);
      setLoading(categoriaId);

      try {
        const res = await fetch('/api/admin/sorteo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoriaId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Error al realizar el sorteo');
          return;
        }
        setSuccess(`Sorteo realizado para ${nombre}`);
        router.refresh();
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(null);
      }
    },
    [loading, router],
  );

  return (
    <div>
      {error && <div className="toast toast-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="toast toast-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        {categorias.map((c) => (
          <div key={c.id} className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{c.nombre}</h3>
            {c.sorteo_realizado ? (
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: 'var(--color-success)',
                    color: '#fff',
                  }}
                >
                  Sorteo realizado
                </span>
                {c.sorteo_en && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                    {new Date(c.sorteo_en).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleSorteo(c.id, c.nombre)}
                disabled={loading !== null}
                style={{ fontSize: '0.85rem' }}
              >
                {loading === c.id ? 'Sorteando…' : 'Realizar sorteo'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
