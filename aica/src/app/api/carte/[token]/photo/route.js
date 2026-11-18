import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { token } = await params;
  const sql = await getDb();
  const [m] = await sql`select photo from members where token = ${token}`;
  if (!m?.photo) return new Response('Introuvable', { status: 404 });
  return new Response(m.photo, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
}
