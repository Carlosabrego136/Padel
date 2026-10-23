/**
 * Fondo de la portada: foto real de pádel en acción, una versión vertical para
 * celular y una horizontal para computadora (se muestra la que corresponda
 * según el ancho de pantalla, por CSS).
 */
export default function HeroMotion() {
  return (
    <div className="hero__video-wrap" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero__video hero__video--mobile" src="/brand/hero-mobile.jpg" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero__video hero__video--desktop" src="/brand/hero-desktop.jpg" alt="" />
      <div className="hero__overlay" />
    </div>
  );
}
