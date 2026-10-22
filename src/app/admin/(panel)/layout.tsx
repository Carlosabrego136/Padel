import { requireAdminPage } from '@/lib/auth-page';
import AdminShell from './AdminShell';

export const metadata = { title: 'Panel' };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
