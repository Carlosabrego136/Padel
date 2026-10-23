import Link from 'next/link';
import HeroMotion from '@/components/HeroMotion';
import HeroNav from '@/components/HeroNav';
import SiteFooter from '@/components/SiteFooter';
import { getConfig } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const config = await getConfig().catch(() => new Map<string, string>());
  const telefono = config.get('club_telefono') ?? '';
  const direccion = config.get('club_direccion') ?? '';
  const easycancha = config.get('club_easycancha') ?? '';
  const telefonoLink = telefono ? `https://wa.me/52${telefono}` : '';
  const reservaWhatsappLink = telefono
    ? `https://wa.me/52${telefono}?text=${encodeURIComponent('Hola, quisiera reservar una cancha en Pádel Life. ¿Qué horarios tienen disponibles?')}`
    : '';

  return (
    <>
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

      {/* Contacto — dirección y WhatsApp del club, bien visible */}
      {(telefono || direccion) && (
        <section className="contact-strip">
          <div className="container contact-strip__inner">
            {direccion && (
              <div className="contact-strip__item">
                <span className="contact-strip__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <div>
                  <p className="contact-strip__label">Dirección</p>
                  <p className="contact-strip__value">{direccion}</p>
                </div>
              </div>
            )}
            {telefono && (
              <a className="contact-strip__item contact-strip__item--link" href={telefonoLink} target="_blank" rel="noopener noreferrer">
                <span className="contact-strip__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                <div>
                  <p className="contact-strip__label">Solo WhatsApp &middot; no hay línea telefónica</p>
                  <p className="contact-strip__value">{formatTelHome(telefono)}</p>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Reserva de cancha — WhatsApp y EasyCancha, botones destacados */}
      {(reservaWhatsappLink || easycancha) && (
        <section className="reserva-strip">
          <div className="container reserva-strip__inner">
            <div className="reserva-strip__text">
              <h2 className="reserva-strip__title">Reserva tu cancha</h2>
              <p className="reserva-strip__subtitle">
                Agenda tu horario de juego de forma rápida y sencilla, directamente por WhatsApp o a través de
                nuestra aplicación de reservaciones.
              </p>
            </div>
            <div className="reserva-strip__actions">
              {reservaWhatsappLink && (
                <a
                  href={reservaWhatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-chamfer reserva-strip__btn reserva-strip__btn--whatsapp"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                  Reservar por WhatsApp
                </a>
              )}
              {easycancha && (
                <a
                  href={easycancha}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-chamfer reserva-strip__btn reserva-strip__btn--app"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="4" y="2" width="16" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                    <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  Reservar en EasyCancha
                </a>
              )}
            </div>
          </div>
        </section>
      )}

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
              Cada semana juegas un solo partido: puede tocarte retar a la pareja de arriba, o que te rete la de
              abajo. Si ganas, subes; si pierdes, bajas. Al llegar al primer lugar de tu categoría, puedes ascender
              retando al último lugar de la categoría superior.
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

    </main>
    <SiteFooter />
    </>
  );
}

function formatTelHome(t: string): string {
  if (t.length !== 10) return t;
  return `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}`;
}
