'use client';

import { Suspense, useState, useCallback, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_RETRIES = 0; // login no se reintenta automáticamente

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (loading) return;

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setError('Ingresa tu correo y contraseña');
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Error al iniciar sesión');
          return;
        }

        router.replace(redirect);
      } catch {
        setError('Error de conexión. Verifica tu internet.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, loading, redirect, router],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--color-bg)',
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4, color: 'var(--color-accent)' }}>
          Pádel Life
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
          Panel de administración
        </p>

        {searchParams.get('error') === 'db' && (
          <div className="toast toast-error" style={{ marginBottom: 16 }}>
            Error de conexión a la base de datos. Intenta de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              className="form-input"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
