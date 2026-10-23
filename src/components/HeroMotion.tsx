'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo de video del hero (spec Targo): posicionado absoluto, sin recorte
 * (object-fit: contain), con reintento de reproducción robusto.
 * La URL del video se reemplaza cuando el cliente la proporcione.
 */

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4';
const POSTER_SRC =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg';
const MAX_RETRIES = 10;

export default function HeroMotion() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let attempts = 0;
    let cancelled = false;

    const tryPlay = () => {
      if (cancelled || attempts >= MAX_RETRIES) return;
      attempts += 1;
      el.muted = true;
      el.play().catch(() => {
        // Video no disponible o bloqueado todavía: se reintenta (hasta MAX_RETRIES veces).
      });
    };

    tryPlay();
    const interval = setInterval(tryPlay, 1000);

    const onFirstInteraction = () => {
      tryPlay();
    };
    document.addEventListener('click', onFirstInteraction, { once: true });
    document.addEventListener('touchstart', onFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('click', onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
    };
  }, []);

  return (
    <div className="hero__video-wrap" aria-hidden="true">
      <video
        ref={videoRef}
        className="hero__video"
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER_SRC}
      />
      <div className="hero__overlay" />
    </div>
  );
}
