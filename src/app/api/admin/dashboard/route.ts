import { requireAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
import { clientIp, json, route } from '@/lib/http';
import { adminGetDashboard } from '@/lib/queries';

export const GET = route(async (req) => {
  const ip = clientIp(req);
  await requireAdmin(req, ip);
  const data = await adminGetDashboard();
  return json(data);
});
