'use client';

import { useEffect, useRef } from 'react';

/**
 * Vexel-spec: fondo de video para el hero, con <video> alineado al fondo del contenedor.
 * Carga lazy, muted, loop, playsInline. Si el video no está disponible (o falla), se ve solo el overlay.
 * La URL del video se debe configurar cuando el cliente la proporcione.
 */

const VIDEO_SRC = '/brand/hero.mp4'; // placeholder: se reemplaza cuando el cliente envíe el video

export default function HeroMotion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attempted = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || attempted.current) return;
    attempted.current = true;

    // Solo reproducir si no hay preferencia de movimiento reducido
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.play().catch(() => {
      // Video no disponible o bloqueado: no es un error crítico
    });
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
        preload="metadata"
        poster="/brand/hero-poster.jpg"
      />
      <div className="hero__overlay" />
    </div>
  );
}
