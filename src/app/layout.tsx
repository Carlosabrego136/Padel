import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pádel Life · Ranking', template: '%s | Pádel Life' },
  description: 'Ranking oficial de parejas del torneo de pádel en Tepic, Nayarit. Consulta posiciones, jornadas y resultados.',
  openGraph: {
    title: 'Pádel Life · Ranking',
    description: 'Ranking oficial del torneo de pádel en Tepic, Nayarit.',
    images: [{ url: '/brand/og.png', width: 1200, height: 630 }],
    locale: 'es_MX',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060a16',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="intro" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Inline script to drive the entrance animation and set data-intro="done" */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    document.documentElement.classList.remove('intro');
    document.documentElement.dataset.intro='done';
    return;
  }
  var els=document.querySelectorAll('.hero__nav-logo,.hero__nav-links,.hero__nav-cta,.hero__title,.hero__subtitle,.hero__cta');
  if(!els.length){document.documentElement.dataset.intro='done';return;}
  var i=0;
  function go(){
    if(i>=els.length){document.documentElement.dataset.intro='done';return;}
    els[i].animate([
      {opacity:0,transform:'translateY(clamp(12px,3vw,30px))'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:600,easing:'cubic-bezier(0.16,1,0.3,1)',fill:'forwards'});
    i++;setTimeout(go,180);
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',go);}else{go();}
  setTimeout(function(){document.documentElement.dataset.intro='done';},3500);
})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
