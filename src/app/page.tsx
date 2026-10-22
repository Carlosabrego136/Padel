import Link from 'next/link';
import Image from 'next/image';
import HeroMotion from '@/components/HeroMotion';
import SiteHeader from '@/components/SiteHeader';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero — Vexel spec */}
        <section className="hero">
          <HeroMotion />
          <div className="hero__content">
            <Image
              src="/brand/logo.png"
              alt="Pádel Life"
              width={320}
              height={138}
              priority
              className="hero__logo"
            />
            <h1 className="hero__title">Ranking de Parejas</h1>
            <p className="hero__subtitle">
              Torneo oficial en Tepic, Nayarit. Consulta tu posición, reta a la pareja de arriba y sube en el ranking.
            </p>
            <Link href="/ranking" className="hero__cta">
              Ver ranking →
            </Link>
          </div>
        </section>

        {/* Info cards */}
        <section className="section" style={{ background: 'var(--color-bg-alt)' }}>
          <div className="container">
            <h2 className="section__title" style={{ textAlign: 'center' }}>¿Cómo funciona?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-accent)' }}>1. Inscríbete</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Registra a tu pareja en la categoría que les corresponda. El club confirmará tu inscripción.
                </p>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-accent)' }}>2. Reta</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Cada semana puedes retar a la pareja que está una posición arriba. Si ganas, subes; si pierdes, bajas.
                </p>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-accent)' }}>3. Sube</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  Si llegas al primer lugar de tu categoría, puedes ascender a la categoría superior retando al último lugar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 className="section__title">¿Listo para competir?</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
              Inscríbete con tu pareja y únete al ranking.
            </p>
            <Link href="/inscripcion" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 32px' }}>
              Inscribir pareja
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--color-border)', padding: '24px 0', textAlign: 'center' }}>
          <div className="container">
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              © {new Date().getFullYear()} Pádel Life · Tepic, Nayarit
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
