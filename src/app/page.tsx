import Link from 'next/link';
import HeroMotion from '@/components/HeroMotion';
import HeroNav from '@/components/HeroNav';

export default function HomePage() {
  return (
    <main>
      {/* Hero — spec Targo: navbar embebida, titular en escalera, video a la derecha */}
      <section className="hero">
        <HeroMotion />
        <HeroNav />

        <div className="hero__content">
          <h1 className="hero__title">
            <span>Ranking</span>
            <span>de</span>
            <span className="indent accent">Parejas</span>
          </h1>
          <p className="hero__subtitle">
            Torneo oficial en Tepic, Nayarit. Consulta tu posición, reta a la pareja de arriba y sube en el ranking.
          </p>
          <Link href="/ranking" className="hero__cta">
            Ver ranking →
          </Link>
        </div>
      </section>

      {/* Cómo funciona — spec Targo: sección "About" de dos columnas */}
      <section className="about">
        <div className="about__wrap">
          <div className="about__col-text">
            <h2 className="hero__title about__title">
              <span>Cómo</span>
              <span className="indent accent">Funciona</span>
            </h2>
            <p className="about__text">
              Regístrate con tu pareja en la categoría que les corresponda y el club confirmará su inscripción.
              Cada semana puedes retar a la pareja que está una posición arriba: si ganas, subes; si pierdes, bajas.
              Al llegar al primer lugar de tu categoría, puedes ascender retando al último lugar de la categoría
              superior.
            </p>
            <Link href="/reglamento" className="btn-chamfer about__cta">
              Ver reglamento
            </Link>
          </div>

          <div className="about__col-media">
            <div className="about__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="about__placeholder"
                src="https://images.unsplash.com/photo-1770230901556-4e1c0bacfb09?w=1200&q=80&auto=format&fit=crop"
                alt="Pareja jugando pádel"
                loading="lazy"
              />
              <div className="about__media-overlay" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="cta-banner">
        <div className="cta-banner__overlay" />
        <div className="container cta-banner__content">
          <h2 className="section__title">¿Listo para competir?</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            Inscríbete con tu pareja y únete al ranking.
          </p>
          <Link href="/inscripcion" className="btn-chamfer">
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
  );
}
