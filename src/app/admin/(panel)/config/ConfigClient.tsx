'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG_DEFS } from '@/lib/validation';
import type { ConfigRow, CategoriaRow } from '@/lib/queries';

interface Props {
  config: ConfigRow[];
  categorias: CategoriaRow[];
  /** No usado directamente: ConfigClient deriva las etiquetas de CONFIG_DEFS. */
  defs?: { clave: string; etiqueta: string; ayuda: string | null }[];
}

const MAX_RETRIES = 2;

export default function ConfigClient({ config, categorias }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(config.map((c) => [c.clave, c.valor])),
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [exito, setExito] = useState<string | null>(null);

  const [categoriasState, setCategoriasState] = useState(categorias);
  const [guardandoCategoria, setGuardandoCategoria] = useState<number | null>(null);
  const [errorCategoria, setErrorCategoria] = useState<string | null>(null);

  const handleToggleCategoria = useCallback(
    async (categoriaId: number, ocultaActual: boolean) => {
      if (guardandoCategoria) return;
      setErrorCategoria(null);
      setGuardandoCategoria(categoriaId);
      const nuevoOculta = !ocultaActual;
      try {
        const res = await fetch('/api/admin/categorias', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoriaId, oculta: nuevoOculta }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setErrorCategoria(data?.error ?? 'No se pudo actualizar la categoría');
          return;
        }
        setCategoriasState((prev) =>
          prev.map((c) => (c.id === categoriaId ? { ...c, oculta: nuevoOculta } : c)),
        );
        router.refresh();
      } catch {
        setErrorCategoria('Error de conexión');
      } finally {
        setGuardandoCategoria(null);
      }
    },
    [guardandoCategoria, router],
  );

  const [reiniciando, setReiniciando] = useState(false);
  const [errorReinicio, setErrorReinicio] = useState<string | null>(null);
  const [exitoReinicio, setExitoReinicio] = useState<string | null>(null);

  const claves = Object.keys(CONFIG_DEFS);

  const handleReiniciarTemporada = useCallback(async () => {
    if (reiniciando) return;
    if (
      !confirm(
        '¿Reiniciar la temporada? Esto retira del ranking a TODAS las parejas pendientes o aprobadas ' +
          '(no se borran, quedan archivadas en el historial) y libera el sorteo de todas las categorías ' +
          'para que se pueda volver a sortear. Después, actualiza las fechas de la nueva temporada aquí ' +
          'mismo en Configuración. Esta acción no se puede deshacer. ¿Continuar?',
      )
    ) {
      return;
    }

    setErrorReinicio(null);
    setExitoReinicio(null);
    setReiniciando(true);
    try {
      const res = await fetch('/api/admin/temporada/reiniciar', {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorReinicio(data?.error ?? 'No se pudo reiniciar la temporada');
        return;
      }
      const n = data?.resultado?.parejasRetiradas ?? 0;
      setExitoReinicio(
        n > 0
          ? `Temporada reiniciada: se retiraron ${n} pareja(s) y se liberó el sorteo de todas las categorías.`
          : 'Temporada reiniciada: no había parejas activas que retirar. Se liberó el sorteo de todas las categorías.',
      );
      router.refresh();
    } catch {
      setErrorReinicio('Error de conexión');
    } finally {
      setReiniciando(false);
    }
  }, [reiniciando, router]);

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

      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
          Categorías visibles en el ranking público
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 14 }}>
          Oculta una categoría de la página pública de Ranking mientras no tenga parejas (para que no se
          vea sola o vacía). No afecta inscripciones, sorteo ni partidos — solo lo que se ve en esa página.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categoriasState.map((c) => (
            <label
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--color-bg-alt)',
                cursor: guardandoCategoria === c.id ? 'default' : 'pointer',
                opacity: guardandoCategoria === c.id ? 0.6 : 1,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.nombre}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {c.oculta ? 'Oculta' : 'Visible'}
                </span>
                <input
                  type="checkbox"
                  checked={!c.oculta}
                  disabled={guardandoCategoria === c.id}
                  onChange={() => handleToggleCategoria(c.id, c.oculta)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </span>
            </label>
          ))}
        </div>
        {errorCategoria && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 10 }}>{errorCategoria}</p>
        )}
      </div>

      <div
        className="card"
        style={{ padding: 16, marginBottom: 24, border: '1px solid var(--color-error)' }}
      >
        <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--color-error)' }}>
          Reiniciar temporada
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Úsalo cuando termine esta temporada y vayan a arrancar una nueva. Retira del ranking a todas
          las parejas pendientes o aprobadas (quedan archivadas en el historial, no se borra nada) y
          libera el sorteo de todas las categorías. Después, actualiza aquí mismo las fechas de la
          nueva temporada.
        </p>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--color-error)', color: '#fff', border: 'none' }}
          disabled={reiniciando}
          onClick={handleReiniciarTemporada}
        >
          {reiniciando ? 'Reiniciando…' : 'Reiniciar temporada'}
        </button>
        {exitoReinicio && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: 10 }}>
            {exitoReinicio}
          </p>
        )}
        {errorReinicio && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 10 }}>{errorReinicio}</p>
        )}
      </div>

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
