import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { token } = await params;
  const sql = await getDb();
  const [m] = await sql`select number, pdf, status from members where token = ${token}`;
  if (!m?.pdf || m.status !== 'active') return new Response('Carte introuvable', { status: 404 });
  const dl = new URL(request.url).searchParams.has('telecharger');
  return new Response(m.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="carte-${m.number}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
