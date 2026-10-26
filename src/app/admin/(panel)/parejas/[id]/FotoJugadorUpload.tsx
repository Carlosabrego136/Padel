'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  jugadorId: string;
  nombre: string;
  tieneFoto: boolean;
}

/** Miniatura + subir/reemplazar la foto de un jugador, usada en el detalle de pareja del admin. */
export default function FotoJugadorUpload({ jugadorId, nombre, tieneFoto }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fuerza a recargar la imagen tras subir una nueva, para no ver la versión en caché.
  const [version, setVersion] = useState(0);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append('foto', file);
        const res = await fetch(`/api/admin/jugadores/${jugadorId}/foto`, { method: 'PUT', body: fd });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? 'No se pudo subir la foto');
          return;
        }
        setVersion((v) => v + 1);
        router.refresh();
      } catch {
        setError('Error de conexión al subir la foto');
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [jugadorId, router],
  );

  const mostrarFoto = tieneFoto || version > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/foto/${jugadorId}?v=${version}`}
          alt={nombre}
          width={36}
          height={36}
          style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--color-bg-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {nombre.charAt(0).toUpperCase()}
        </div>
      )}

      <button
        type="button"
        className="btn btn-secondary"
        style={{ fontSize: '0.75rem', padding: '5px 10px' }}
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Subiendo…' : mostrarFoto ? 'Cambiar foto' : 'Subir foto'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}
