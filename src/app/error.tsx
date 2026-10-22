'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to console in production; the error boundary already stops propagation
    console.error('[PádelLife] Error de página:', error.message);
  }, [error]);

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div>
        <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Algo salió mal</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
          Ocurrió un error inesperado. Inténtalo de nuevo.
        </p>
        <button onClick={reset} className="btn btn-primary">
          Reintentar
        </button>
      </div>
    </div>
  );
}
