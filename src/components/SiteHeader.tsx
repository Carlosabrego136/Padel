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
        background: 'rgba(242, 241, 240, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Link href="/" aria-label="Pádel Life — Inicio" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Image src="/brand/logo.png" alt="Pádel Life" width={120} height={52} priority style={{ height: 'auto', width: 'clamp(80px, 12vw, 120px)' }} />
      </Link>
      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link
          href="/ranking"
          style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
        >
          Ranking
        </Link>
        <Link
          href="/reglamento"
          style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}
        >
          Reglamento
        </Link>
        <Link href="/inscripcion" className="hero__nav-contact" style={{ fontSize: '0.75rem', padding: '10px 18px' }}>
          Inscripción
        </Link>
      </nav>
    </header>
  );
}
