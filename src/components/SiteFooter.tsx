import Image from 'next/image';
import Link from 'next/link';

const REDES = [
  {
    nombre: 'Instagram',
    href: 'https://www.instagram.com/padel.lifetpc?psln=MWZucnpzdTdqYjY4bQ==',
    color: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.3" cy="6.7" r="1.3" fill="currentColor" />
      </svg>
    ),
  },
  {
    nombre: 'TikTok',
    href: 'https://www.tiktok.com/@padellife.tepic?_r=1&_t=ZS-97DHx90DtE9',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M16.5 2h-3v13.2a2.8 2.8 0 1 1-2.2-2.73V9.4a6 6 0 1 0 5.2 5.95V9.1a7.3 7.3 0 0 0 4.3 1.4V7.5a4.3 4.3 0 0 1-4.3-4.3V2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    nombre: 'WhatsApp',
    href: 'https://api.whatsapp.com/send/?phone=3112556229&text&type=phone_number&app_absent=0',
    color: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8.3 7.7c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.1.2-.1.3-.3.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.6-.7c.2-.3.4-.2.7-.1l1.6.8c.2.1.4.2.5.3.1.2.1.9-.2 1.4-.3.6-1.5 1.1-2.1 1.2-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    nombre: 'Facebook',
    href: 'https://www.facebook.com/people/Padel-life/61585311342300/?mibextid=wwXIfr&rdid=WTCFDsYZ5f7DPICj&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1Hq8pi5pHF%2F%3Fmibextid%3DwwXIfr',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M14.5 22v-8.5h2.9l.4-3.3h-3.3V8.1c0-1 .3-1.6 1.7-1.6h1.8V3.5c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v2.3H8.1v3.3h2.9V22h3.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <Image
            src="/brand/logo-dark.png"
            alt="Pádel Life"
            width={140}
            height={60}
            style={{ height: 'auto', width: 'clamp(100px, 14vw, 140px)' }}
          />
          <p className="site-footer__tagline">Ranking oficial de pádel en Tepic, Nayarit.</p>
        </div>

        <nav className="site-footer__links" aria-label="Enlaces del sitio">
          <Link href="/ranking">Ranking</Link>
          <Link href="/reglamento">Reglamento</Link>
          <Link href="/inscripcion">Inscripción</Link>
        </nav>

        <div className="site-footer__social">
          <span className="site-footer__social-label">Síguenos</span>
          <div className="site-footer__social-row">
            {REDES.map((r) => (
              <a
                key={r.nombre}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={r.nombre}
                className="site-footer__social-link"
                style={{ ['--social-color' as string]: r.color }}
              >
                {r.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} Pádel Life · Tepic, Nayarit</p>
        </div>
      </div>
    </footer>
  );
}
