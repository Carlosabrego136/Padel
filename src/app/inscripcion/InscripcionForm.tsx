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

    const fd = new FormData(e.currentTarget);
    const body = {
      categoria: fd.get('categoria') as string,
      jugador1: {
        nombre: (fd.get('j1_nombre') as string).trim(),
        genero: fd.get('j1_genero') as string,
        telefono: (fd.get('j1_telefono') as string).trim() || undefined,
      },
      jugador2: {
        nombre: (fd.get('j2_nombre') as string).trim(),
        genero: fd.get('j2_genero') as string,
        telefono: (fd.get('j2_telefono') as string).trim() || undefined,
      },
      telefonoContacto: (fd.get('telefonoContacto') as string).trim(),
      aceptaPublicar: fd.get('aceptaPublicar') === 'on',
      aceptaReglamento: fd.get('aceptaReglamento') === 'on',
    };

    retryCount.current = 0;
    let lastErr = '';

    while (retryCount.current <= MAX_RETRIES) {
      try {
        const res = await fetch('/api/inscripcion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
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
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ fontSize: '2rem', marginBottom: 12 }}>✓</p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Inscripción enviada</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
          Tu solicitud ha sido recibida. El club la revisará y te notificará por teléfono.
        </p>
        <Link href="/ranking" className="btn btn-primary">
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
      <fieldset className="form-group">
        <legend className="form-label">Categoría</legend>
        <select name="categoria" className="form-input" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {errors['categoria'] && <p className="form-error">{errors['categoria']}</p>}
      </fieldset>

      {/* Jugador 1 */}
      <fieldset className="form-group">
        <legend className="form-label">Jugador 1</legend>
        <input name="j1_nombre" className="form-input" placeholder="Nombre completo" maxLength={60} required />
        {errors['jugador1.nombre'] && <p className="form-error">{errors['jugador1.nombre']}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <label className="form-radio-label">
            <input type="radio" name="j1_genero" value="M" defaultChecked /> Hombre
          </label>
          <label className="form-radio-label">
            <input type="radio" name="j1_genero" value="F" /> Mujer
          </label>
        </div>
        {errors['jugador1.genero'] && <p className="form-error">{errors['jugador1.genero']}</p>}
        <input name="j1_telefono" className="form-input" placeholder="Teléfono (opcional)" maxLength={15} style={{ marginTop: 8 }} />
        {errors['jugador1.telefono'] && <p className="form-error">{errors['jugador1.telefono']}</p>}
      </fieldset>

      {/* Jugador 2 */}
      <fieldset className="form-group">
        <legend className="form-label">Jugador 2</legend>
        <input name="j2_nombre" className="form-input" placeholder="Nombre completo" maxLength={60} required />
        {errors['jugador2.nombre'] && <p className="form-error">{errors['jugador2.nombre']}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <label className="form-radio-label">
            <input type="radio" name="j2_genero" value="M" defaultChecked /> Hombre
          </label>
          <label className="form-radio-label">
            <input type="radio" name="j2_genero" value="F" /> Mujer
          </label>
        </div>
        {errors['jugador2.genero'] && <p className="form-error">{errors['jugador2.genero']}</p>}
        <input name="j2_telefono" className="form-input" placeholder="Teléfono (opcional)" maxLength={15} style={{ marginTop: 8 }} />
        {errors['jugador2.telefono'] && <p className="form-error">{errors['jugador2.telefono']}</p>}
      </fieldset>

      {/* Contacto */}
      <fieldset className="form-group">
        <legend className="form-label">Teléfono de contacto</legend>
        <input name="telefonoContacto" className="form-input" placeholder="10 dígitos" maxLength={15} required />
        {errors['telefonoContacto'] && <p className="form-error">{errors['telefonoContacto']}</p>}
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Este número será visible en la tabla de ranking.
        </p>
      </fieldset>

      {/* Checkboxes */}
      <div className="form-group">
        <label className="form-checkbox-label">
          <input type="checkbox" name="aceptaPublicar" required />
          <span>Autorizo publicar el teléfono de contacto en la tabla de ranking</span>
        </label>
        {errors['aceptaPublicar'] && <p className="form-error">{errors['aceptaPublicar']}</p>}
      </div>
      <div className="form-group">
        <label className="form-checkbox-label">
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

      {/* Submit */}
      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar inscripción'}
      </button>
    </form>
  );
}
