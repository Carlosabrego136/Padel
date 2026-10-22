'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG_DEFS } from '@/lib/validation';
import type { ConfigRow } from '@/lib/queries';

interface Props {
  config: ConfigRow[];
  /** No usado directamente: ConfigClient deriva las etiquetas de CONFIG_DEFS. */
  defs?: { clave: string; etiqueta: string; ayuda: string | null }[];
}

const MAX_RETRIES = 2;

export default function ConfigClient({ config }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(config.map((c) => [c.clave, c.valor])),
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [exito, setExito] = useState<string | null>(null);

  const claves = Object.keys(CONFIG_DEFS);

  const handleGuardar = useCallback(
    async (clave: string) => {
      if (guardando) return;
      const def = CONFIG_DEFS[clave];
      const valor = valores[clave] ?? '';

      const errorLocal = def.validar ? def.validar(valor) : null;
      if (errorLocal) {
        setErrores((e) => ({ ...e, [clave]: errorLocal }));
        return;
      }

      setErrores((e) => {
        const next = { ...e };
        delete next[clave];
        return next;
      });
      setExito(null);
      setGuardando(clave);

      let intento = 0;
      let ultimoError = '';
      while (intento <= MAX_RETRIES) {
        try {
          const res = await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave, valor }),
            signal: AbortSignal.timeout(15_000),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            ultimoError = data?.error ?? `Error ${res.status}`;
            if (res.status >= 400 && res.status < 500) break;
            intento++;
            continue;
          }
          setExito(`"${def.etiqueta}" actualizado`);
          router.refresh();
          setGuardando(null);
          return;
        } catch {
          ultimoError = 'Error de conexión';
          intento++;
        }
      }
      setErrores((e) => ({ ...e, [clave]: ultimoError || 'No se pudo guardar' }));
      setGuardando(null);
    },
    [guardando, valores, router],
  );

  return (
    <div>
      {exito && <div className="toast toast-success" style={{ marginBottom: 16 }}>{exito}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {claves.map((clave) => {
          const def = CONFIG_DEFS[clave];
          const valorActual = valores[clave] ?? '';
          const error = errores[clave];

          return (
            <div key={clave} className="card" style={{ padding: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                {def.etiqueta}
              </label>
              {def.ayuda && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  {def.ayuda}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  style={{ maxWidth: 280 }}
                  value={valorActual}
                  maxLength={200}
                  onChange={(e) =>
                    setValores((v) => ({ ...v, [clave]: e.target.value }))
                  }
                />
                <button
                  className="btn btn-sm btn-primary"
                  disabled={guardando === clave}
                  onClick={() => handleGuardar(clave)}
                >
                  {guardando === clave ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              {error && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-danger)', marginTop: 6 }}>{error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
