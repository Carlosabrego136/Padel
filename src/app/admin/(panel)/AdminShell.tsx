'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Inicio', icon: '📊' },
  { href: '/admin/parejas', label: 'Parejas', icon: '👥' },
  { href: '/admin/sorteo', label: 'Sorteo', icon: '🎲' },
  { href: '/admin/partidos', label: 'Partidos', icon: '🏸' },
  { href: '/admin/jornadas', label: 'Jornadas', icon: '📅' },
  { href: '/admin/campeones', label: 'Premio al campeón', icon: '🏆' },
  { href: '/admin/auditoria', label: 'Auditoría', icon: '📋' },
  { href: '/admin/config', label: 'Configuración', icon: '⚙️' },
];

export default function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Aun si falla, redirigir
    } finally {
      router.replace('/admin/login');
    }
  }, [loggingOut, router]);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="admin-layout">
      {/* Video de fondo */}
      <video
        className="admin-bg-video"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_214302_820066a8-f3de-43f3-ab1d-96bd8b2716e6.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="admin-bg-overlay admin-bg-overlay--panel" aria-hidden="true" />

      {/* Mobile hamburger */}
      <button
        className="admin-menu-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Menú"
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 110,
          background: 'var(--color-bg-alt)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'none',
          fontSize: '1.2rem',
          color: 'var(--color-text)',
        }}
      >
        ☰
      </button>

      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-dark.png" alt="Pádel Life" className="admin-sidebar__logo" />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {email}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link${isActive(item.href) ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={{ marginRight: 10, fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 89,
            display: 'none',
          }}
          className="admin-overlay"
        />
      )}

      <main className="admin-main">{children}</main>

      <style jsx global>{`
        @media (max-width: 768px) {
          .admin-menu-toggle { display: block !important; }
          .admin-overlay { display: block !important; }
          .admin-main { padding-top: 56px !important; }
        }
      `}</style>
    </div>
  );
}
