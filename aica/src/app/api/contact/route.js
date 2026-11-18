import { NextResponse } from 'next/server';
import { getDb, dbConfigured } from '@/lib/db';
import { hashIp } from '@/lib/auth';

export async function POST(request) {
  if (!dbConfigured()) return NextResponse.json({ erreur: 'Service momentanément indisponible.' }, { status: 503 });
  const f = await request.json().catch(() => ({}));
  if (f.site_web) return NextResponse.json({ ok: true });
  const nom = String(f.nom || '').trim().slice(0, 80), email = String(f.email || '').trim().slice(0, 120), message = String(f.message || '').trim().slice(0, 3000);
  if (nom.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || message.length < 5) return NextResponse.json({ erreur: 'Merci de remplir correctement tous les champs.' }, { status: 422 });
  const sql = await getDb();
  const ip = hashIp(request);
  const [{ n }] = await sql`select count(*)::int n from messages where ip_hash = ${ip} and created_at > now() - interval '1 hour'`;
  if (n >= 5) return NextResponse.json({ erreur: 'Trop de messages. Réessayez plus tard.' }, { status: 429 });
  await sql`insert into messages (nom, email, message, ip_hash) values (${nom}, ${email}, ${message}, ${ip})`;
  return NextResponse.json({ ok: true });
}
