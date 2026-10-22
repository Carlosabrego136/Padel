import { query } from '@/lib/db';
import { json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  try {
    await query('SELECT 1');
    return json({ ok: true, db: true, ms: Date.now() - t0 });
  } catch {
    return json({ ok: false, db: false, ms: Date.now() - t0 }, 503);
  }
}
