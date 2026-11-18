import { isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  if (!(await isAdmin())) return new Response('Non autorisé', { status: 401 });
  const { id } = await params;
  const sql = await getDb();
  const [m] = await sql`select photo from members where id = ${Number(id) || 0}`;
  if (!m?.photo) return new Response('Introuvable', { status: 404 });
  return new Response(m.photo, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
}
