'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CategoriaRow, ParejaRanking } from '@/lib/queries';

interface Props {
  categorias: CategoriaRow[];
  ranking: Record<number, ParejaRanking[]>;
}

export default function RankingClient({ categorias, ranking }: Props) {
  const [activa, setActiva] = useState(categorias[0]?.id ?? 0);
  const parejas = ranking[activa] ?? [];

  return (
    <>
      {/* Tabs */}
      <div className="category-tabs" role="tablist" aria-label="Categorías">
        {categorias.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === activa}
            className={`category-tab${c.id === activa ? ' category-tab--active' : ''}`}
            onClick={() => setActiva(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Table */}
      {parejas.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>
          No hay parejas en esta categoría aún.
        </p>
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Pareja</th>
                <th style={{ width: 100, textAlign: 'center' }}>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {parejas.map((p, i) => (
                <tr key={p.id}>
                  <td className="ranking-pos">{p.posicion ?? i + 1}</td>
                  <td>
                    <Link href={`/pareja/${p.id}`} className="ranking-link">
                      {p.jugadores.map((j) => j.nombre).join(' / ') || '—'}
                    </Link>
                    {p.mixta && <span className="badge badge-mix">Mixta</span>}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {p.acepta_publicar ? (
                      <a href={`tel:${p.telefono_contacto}`} style={{ color: 'var(--color-accent)' }}>
                        {formatTel(p.telefono_contacto)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function formatTel(t: string): string {
  if (t.length !== 10) return t;
  return `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}`;
}
