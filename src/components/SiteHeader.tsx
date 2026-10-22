import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Link href="/" aria-label="Pádel Life — Inicio" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Image src="/brand/logo.png" alt="Pádel Life" width={120} height={52} priority style={{ height: 'auto', width: 'clamp(80px, 12vw, 120px)' }} />
      </Link>
      <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/ranking" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Ranking
        </Link>
        <Link href="/inscripcion" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Inscripción
        </Link>
        <Link href="/reglamento" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Reglamento
        </Link>
      </nav>
    </header>
  );
}
