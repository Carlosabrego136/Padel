import { requireAdminPage } from '@/lib/auth-page';
import AdminShell from './AdminShell';

export const metadata = { title: 'Panel' };

// Interruptor manual: en true, el panel de administrador queda bloqueado (muestra un aviso
// en vez del contenido). El sitio público y las inscripciones NO se ven afectadas: esto solo
// corta el acceso a /admin/*, nada de datos se toca. Para reactivar, cambiar a false.
const PANEL_PAUSADO = true;

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  if (PANEL_PAUSADO) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0a1430',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#2a0d0d',
            border: '1.5px solid #e23b3b',
            borderRadius: 14,
            padding: '32px 28px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: '#ff6b6b', marginBottom: 14 }}>
            Acceso temporalmente pausado
          </div>
          <p style={{ fontSize: 13.5, color: '#f3d4d4', lineHeight: 1.6, marginBottom: 14 }}>
            El panel de administración se encuentra pausado por una confirmación de pago
            pendiente relacionada con el desarrollo de esta plataforma.
          </p>
          <p style={{ fontSize: 13.5, color: '#f3d4d4', lineHeight: 1.6, marginBottom: 14 }}>
            Las inscripciones de los jugadores se siguen recibiendo con normalidad y no se
            pierde ningún dato.
          </p>
          <p style={{ fontSize: 13.5, color: '#f3d4d4', lineHeight: 1.6 }}>
            Para reactivar el acceso, favor de contactar directamente al desarrollador.
          </p>
        </div>
      </div>
    );
  }

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
