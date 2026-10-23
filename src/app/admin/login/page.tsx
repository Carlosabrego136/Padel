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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="admin-login-page">
      <video
        className="admin-bg-video"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_214302_820066a8-f3de-43f3-ab1d-96bd8b2716e6.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="admin-bg-overlay" aria-hidden="true" />

      <div className="card admin-login-card" style={{ maxWidth: 400, width: '100%', padding: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-dark.png" alt="Pádel Life" className="admin-login-logo" />
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem', textAlign: 'center' }}>
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
            <div className="pw-field-wrap">
              <input
                id="password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A9.6 9.6 0 0112 5c5 0 9 4 10 7-.4 1.2-1.3 2.6-2.5 3.8M6.6 6.6C4.5 8 3 10.1 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
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
