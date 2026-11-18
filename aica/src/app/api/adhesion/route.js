import { NextResponse } from 'next/server';
import { validerMembre } from '@/lib/validate';
import { creerMembre } from '@/lib/members';
import { isAdmin, hashIp } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
  if (!dbConfigured()) return NextResponse.json({ erreur: 'Service momentanément indisponible.' }, { status: 503 });
  let form;
  try { form = await request.formData(); } catch { return NextResponse.json({ erreur: 'Formulaire invalide.' }, { status: 400 }); }
  if (form.get('site_web')) return NextResponse.json({ ok: true }); // piège à robots : champ caché rempli
  const admin = await isAdmin();
  const { ok, erreurs, data } = validerMembre(Object.fromEntries(form), { admin });
  const photo = form.get('photo');
  let buf = null;
  if (!photo || typeof photo === 'string' || photo.size === 0) erreurs.photo = 'Ajoutez une photo d’identité.';
  else if (photo.size > 6 * 1024 * 1024) erreurs.photo = 'Photo trop lourde (6 Mo maximum).';
  else buf = Buffer.from(await photo.arrayBuffer());
  if (!ok || erreurs.photo) return NextResponse.json({ erreurs }, { status: 422 });
  try {
    const r = await creerMembre(data, buf, admin ? null : hashIp(request));
    if (r.doublon) return NextResponse.json({ erreur: 'Une carte existe déjà avec ce numéro de téléphone et cette date de naissance. Contactez l’association si vous l’avez perdue.' }, { status: 409 });
    if (r.limite) return NextResponse.json({ erreur: 'Trop de demandes depuis cette connexion. Réessayez plus tard.' }, { status: 429 });
    return NextResponse.json({ ok: true, token: r.membre.token, number: r.membre.number, id: r.membre.id });
  } catch (e) {
    console.error('[adhesion]', e);
    if (/image|input|corrupt|unsupported/i.test(e.message)) return NextResponse.json({ erreurs: { photo: 'Photo illisible : essayez une autre image (JPG ou PNG).' } }, { status: 422 });
    return NextResponse.json({ erreur: 'Une erreur est survenue. Réessayez dans un instant.' }, { status: 500 });
  }
}
