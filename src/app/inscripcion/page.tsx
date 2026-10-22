import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import InscripcionForm from './InscripcionForm';

export const metadata: Metadata = {
  title: 'Inscripción',
  description: 'Inscribe a tu pareja en el ranking de pádel de Pádel Life en Tepic, Nayarit.',
};

export default function InscripcionPage() {
  return (
    <>
      <SiteHeader />
      <main style={{ paddingTop: 104 }}>
        <section className="section">
          <div className="container" style={{ maxWidth: 600 }}>
            <h1 className="section__title" style={{ textAlign: 'center', marginBottom: 8 }}>
              Inscribir pareja
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 32, fontSize: '0.9rem' }}>
              Llena el formulario para registrar a tu pareja. El club revisará y aprobará la inscripción.
            </p>
            <InscripcionForm />
          </div>
        </section>
      </main>
    </>
  );
}
