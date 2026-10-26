'use client';

import { useState, useCallback, useRef, type FormEvent } from 'react';
import Link from 'next/link';

const CATEGORIAS = [
  { value: 'libre', label: 'Libre' },
  { value: 'tercera', label: 'Tercera' },
  { value: 'cuarta', label: 'Cuarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'femenil', label: 'Femenil' },
] as const;

interface FieldErrors {
  [key: string]: string | undefined;
}

type Status = 'idle' | 'sending' | 'ok' | 'error';

const MAX_RETRIES = 2;

export default function InscripcionForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const retryCount = useRef(0);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setGlobalError('');
    setStatus('sending');

    // Se envía tal cual como multipart/form-data (incluye las fotos, si se eligieron).
    // No se fija el header Content-Type a mano: el navegador lo arma solo con el
    // boundary correcto cuando el body es un FormData.
    const fd = new FormData(e.currentTarget);

    retryCount.current = 0;
    let lastErr = '';

    while (retryCount.current <= MAX_RETRIES) {
      try {
        const res = await fetch('/api/inscripcion', {
          method: 'POST',
          body: fd,
          signal: AbortSignal.timeout(30_000),
        });

        const data = await res.json().catch(() => null);

        if (res.ok) {
          setStatus('ok');
          return;
        }

        if (data?.fields) {
          setErrors(data.fields as FieldErrors);
          setGlobalError(data.error ?? 'Revisa los campos marcados.');
          setStatus('error');
          return;
        }

        if (res.status === 429) {
          setGlobalError('Demasiados intentos. Espera un momento e inténtalo de nuevo.');
          setStatus('error');
          return;
        }

        lastErr = data?.error ?? `Error ${res.status}`;
        if (res.status >= 400 && res.status < 500) {
          setGlobalError(lastErr);
          setStatus('error');
          return;
        }
        // 5xx — retry
      } catch (err) {
        lastErr = err instanceof DOMException && err.name === 'TimeoutError'
          ? 'El servidor tardó demasiado. Inténtalo de nuevo.'
          : 'No se pudo conectar al servidor.';
      }

      retryCount.current++;
      if (retryCount.current <= MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * retryCount.current));
      }
    }

    setGlobalError(lastErr || 'Ocurrió un error inesperado.');
    setStatus('error');
  }, []);

  if (status === 'ok') {
    return (
      <div className="insc-success">
        <span className="insc-success__ball">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Inscripción enviada</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
          Tu solicitud ha sido recibida. El club la revisará y te notificará por teléfono.
        </p>
        <Link href="/ranking" className="btn-chamfer">
          Ver ranking
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {globalError && (
        <div className="toast toast-error" role="alert" style={{ marginBottom: 20 }}>
          {globalError}
        </div>
      )}

      {/* Categoría */}
      <div className="insc-section">
        <span className="insc-section__num">1</span>
        <div className="insc-section__body">
          <fieldset className="form-group" style={{ margin: 0 }}>
            <legend className="insc-section__title">Categoría</legend>
            <select name="categoria" className="form-input" required defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors['categoria'] && <p className="form-error">{errors['categoria']}</p>}
          </fieldset>
        </div>
      </div>

      {/* Jugador 1 */}
      <div className="insc-section">
        <span className="insc-section__num">2</span>
        <div className="insc-section__body">
          <fieldset className="form-group" style={{ margin: 0 }}>
            <legend className="insc-section__title">Jugador 1</legend>
            <input name="j1_nombre" className="form-input" placeholder="Nombre completo" maxLength={60} required />
            {errors['jugador1.nombre'] && <p className="form-error">{errors['jugador1.nombre']}</p>}

            <div className="insc-pill-group">
              <label className="insc-pill">
                <input type="radio" name="j1_genero" value="M" defaultChecked /> Hombre
              </label>
              <label className="insc-pill">
                <input type="radio" name="j1_genero" value="F" /> Mujer
              </label>
            </div>
            {errors['jugador1.genero'] && <p className="form-error">{errors['jugador1.genero']}</p>}

            <input
              name="j1_telefono"
              className="form-input"
              placeholder="Teléfono (opcional)"
              maxLength={15}
              style={{ marginTop: 10 }}
            />
            {errors['jugador1.telefono'] && <p className="form-error">{errors['jugador1.telefono']}</p>}

            <label className="form-label" htmlFor="j1_foto" style={{ display: 'block', marginTop: 10 }}>
              Foto (opcional)
            </label>
            <input
              id="j1_foto"
              name="foto1"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-input"
            />
          </fieldset>
        </div>
      </div>

      {/* Jugador 2 */}
      <div className="insc-section">
        <span className="insc-section__num">3</span>
        <div className="insc-section__body">
          <fieldset className="form-group" style={{ margin: 0 }}>
            <legend className="insc-section__title">Jugador 2</legend>
            <input name="j2_nombre" className="form-input" placeholder="Nombre completo" maxLength={60} required />
            {errors['jugador2.nombre'] && <p className="form-error">{errors['jugador2.nombre']}</p>}

            <div className="insc-pill-group">
              <label className="insc-pill">
                <input type="radio" name="j2_genero" value="M" defaultChecked /> Hombre
              </label>
              <label className="insc-pill">
                <input type="radio" name="j2_genero" value="F" /> Mujer
              </label>
            </div>
            {errors['jugador2.genero'] && <p className="form-error">{errors['jugador2.genero']}</p>}

            <input
              name="j2_telefono"
              className="form-input"
              placeholder="Teléfono (opcional)"
              maxLength={15}
              style={{ marginTop: 10 }}
            />
            {errors['jugador2.telefono'] && <p className="form-error">{errors['jugador2.telefono']}</p>}

            <label className="form-label" htmlFor="j2_foto" style={{ display: 'block', marginTop: 10 }}>
              Foto (opcional)
            </label>
            <input
              id="j2_foto"
              name="foto2"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-input"
            />
          </fieldset>
        </div>
      </div>

      {/* Contacto */}
      <div className="insc-section">
        <span className="insc-section__num">4</span>
        <div className="insc-section__body">
          <fieldset className="form-group" style={{ margin: 0 }}>
            <legend className="insc-section__title">Teléfono de contacto</legend>
            <input name="telefonoContacto" className="form-input" placeholder="10 dígitos" maxLength={15} required />
            {errors['telefonoContacto'] && <p className="form-error">{errors['telefonoContacto']}</p>}
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Este número será visible en la tabla de ranking.
            </p>
          </fieldset>

          <div className="insc-checks" style={{ marginTop: 16 }}>
            <label className="insc-check">
              <input type="checkbox" name="aceptaPublicar" required />
              <span>Autorizo publicar el teléfono de contacto en la tabla de ranking</span>
            </label>
            {errors['aceptaPublicar'] && <p className="form-error">{errors['aceptaPublicar']}</p>}

            <label className="insc-check">
              <input type="checkbox" name="aceptaReglamento" required />
              <span>
                Acepto el{' '}
                <Link href="/reglamento" target="_blank" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                  reglamento
                </Link>
              </span>
            </label>
            {errors['aceptaReglamento'] && <p className="form-error">{errors['aceptaReglamento']}</p>}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button type="submit" className="btn-chamfer insc-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar inscripción'}
      </button>
    </form>
  );
}
