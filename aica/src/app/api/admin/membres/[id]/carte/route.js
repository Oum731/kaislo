import { isAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { regenererCarte } from '@/lib/members';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  if (!(await isAdmin())) return new Response('Non autorisé', { status: 401 });
  const { id } = await params;
  const sql = await getDb();
  let [m] = await sql`select number, pdf from members where id = ${Number(id) || 0}`;
  if (!m) return new Response('Introuvable', { status: 404 });
  const pdf = m.pdf || (await regenererCarte(Number(id)));
  const dl = new URL(request.url).searchParams.has('telecharger');
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="carte-${m.number}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
