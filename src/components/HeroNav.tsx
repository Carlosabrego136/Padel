'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Navbar embebida en el hero (spec Targo): logo real de Pádel Life + enlaces +
 * botón chaflán, con menú hamburguesa en móvil (≤700px).
 */
export default function HeroNav() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <nav className="hero__nav">
        <Link href="/" aria-label="Pádel Life — Inicio" className="hero__nav-logo">
          <Image src="/brand/logo-dark.png" alt="Pádel Life" width={160} height={70} priority />
        </Link>

        <div className="hero__nav-links">
          <Link href="/ranking" className="hero__nav-link">Ranking</Link>
          <Link href="/reglamento" className="hero__nav-link">Reglamento</Link>
        </div>

        <Link href="/inscripcion" className="hero__nav-contact hero__nav-cta">
          Inscripción
        </Link>

        <button
          type="button"
          className="hero__nav-burger"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={toggle}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`hero__nav-mobile${open ? ' open' : ''}`}>
        <Link href="/ranking" onClick={close}>Ranking</Link>
        <Link href="/reglamento" onClick={close}>Reglamento</Link>
        <Link href="/inscripcion" onClick={close}>Inscripción</Link>
      </div>
    </>
  );
}
