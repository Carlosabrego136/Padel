'use client';

import { useState, useCallback } from 'react';

export interface ContactoTelefono {
  nombre: string;
  telefono: string;
  parejaId: string;
}

interface GrupoCategoria {
  categoria: string;
  contactos: ContactoTelefono[];
}

function formatTel(t: string): string {
  if (t.length !== 10) return t;
  return `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}`;
}

function textoLista(contactos: ContactoTelefono[]): string {
  return contactos.map((c) => `${c.nombre} — ${formatTel(c.telefono)}`).join('\n');
}

export default function TelefonosClient({ categorias }: { categorias: GrupoCategoria[] }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = useCallback(async (etiqueta: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(etiqueta);
      setTimeout(() => setCopiado((c) => (c === etiqueta ? null : c)), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, no pasa nada: el usuario puede
      // seleccionar y copiar el texto manualmente.
    }
  }, []);

  const todos = categorias.flatMap((g) => g.contactos);

  return (
    <div>
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: 16,
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--color-bg-card), var(--color-bg-alt))',
          border: '1px solid var(--color-accent-border, var(--color-border))',
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
            {todos.length} jugador{todos.length === 1 ? '' : 'es'} aprobado{todos.length === 1 ? '' : 's'}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            en {categorias.length} categoría{categorias.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '0.85rem' }}
          onClick={() => copiar('__todos__', textoLista(todos))}
        >
          {copiado === '__todos__' ? '¡Copiado!' : 'Copiar lista completa'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {categorias.map((g) => (
          <div key={g.categoria} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                padding: '14px 18px',
                background: 'var(--color-accent)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-on-accent)' }}>
                {g.categoria}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-on-accent)',
                    opacity: 0.85,
                  }}
                >
                  {g.contactos.length} jugador{g.contactos.length === 1 ? '' : 'es'}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => copiar(g.categoria, textoLista(g.contactos))}
                >
                  {copiado === g.categoria ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              {g.contactos.map((c, i) => (
                <div
                  key={`${c.parejaId}-${c.nombre}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 18px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.nombre}</span>
                  <a
                    href={`tel:${c.telefono}`}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--color-accent-border, var(--color-accent))',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTel(c.telefono)}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
