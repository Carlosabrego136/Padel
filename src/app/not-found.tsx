import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main style={{ paddingTop: 104, minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: 12 }}>
            404
          </p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Página no encontrada</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            La página que buscas no existe o ha sido movida.
          </p>
          <Link href="/" className="btn btn-primary">
            Ir al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
