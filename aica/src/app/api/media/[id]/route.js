import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id } = await params;
  const sql = await getDb();
  const [p] = await sql`select image, image_type from posts where id = ${Number(id) || 0} and published`;
  if (!p?.image) return new Response('Introuvable', { status: 404 });
  return new Response(p.image, { headers: { 'Content-Type': p.image_type || 'image/jpeg', 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
}
