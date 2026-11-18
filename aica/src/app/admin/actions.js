'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { exigerAdmin, verifierIdentifiants, ouvrirSession, fermerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { slugUnique } from '@/lib/posts';
import { regenererCarte } from '@/lib/members';
import { validerMembre } from '@/lib/validate';

export async function login(prev, fd) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_EMAIL) return { erreur: 'ADMIN_EMAIL / ADMIN_PASSWORD ne sont pas configurés sur le serveur.' };
  await new Promise((r) => setTimeout(r, 600)); // ralentit les essais en série
  if (!verifierIdentifiants(fd.get('email') || '', fd.get('motdepasse') || '')) return { erreur: 'Identifiants incorrects.' };
  await ouvrirSession();
  redirect('/admin');
}
export async function logout() { await fermerSession(); redirect('/admin/login'); }

// ---------- Contenus (événements / actions / activités) ----------
export async function savePost(prev, fd) {
  await exigerAdmin();
  const id = Number(fd.get('id')) || 0;
  const type = ['event', 'action', 'activity'].includes(fd.get('type')) ? fd.get('type') : 'event';
  const title = String(fd.get('title') || '').trim().slice(0, 140);
  if (title.length < 3) return { erreur: 'Le titre est obligatoire.' };
  const summary = String(fd.get('summary') || '').trim().slice(0, 300);
  const body = String(fd.get('body') || '').trim().slice(0, 20000);
  const location = String(fd.get('location') || '').trim().slice(0, 120);
  const local = String(fd.get('event_date') || '');
  const event_date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? local : null;
  const published = fd.get('published') === 'on';
  const sql = await getDb();
  let image = null, image_type = null;
  const f = fd.get('image');
  if (f && typeof f !== 'string' && f.size > 0) {
    try { image = await sharp(Buffer.from(await f.arrayBuffer()), { failOn: 'none' }).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer(); image_type = 'image/jpeg'; }
    catch { return { erreur: 'Image illisible.' }; }
  }
  const retirer = fd.get('remove_image') === 'on';
  if (id) {
    const slug = await slugUnique(sql, title, id);
    await sql`update posts set type = ${type}, title = ${title}, slug = ${slug}, summary = ${summary}, body = ${body}, location = ${location},
      event_date = ${event_date ? sql`${event_date}::timestamp at time zone 'Africa/Casablanca'` : null}, published = ${published} where id = ${id}`;
    if (image) await sql`update posts set image = ${image}, image_type = ${image_type} where id = ${id}`;
    else if (retirer) await sql`update posts set image = null, image_type = null where id = ${id}`;
  } else {
    const slug = await slugUnique(sql, title);
    await sql`insert into posts (type, title, slug, summary, body, location, event_date, published, image, image_type)
      values (${type}, ${title}, ${slug}, ${summary}, ${body}, ${location}, ${event_date ? sql`${event_date}::timestamp at time zone 'Africa/Casablanca'` : null}, ${published}, ${image}, ${image_type})`;
  }
  revalidatePath('/', 'layout');
  redirect('/admin/contenus?type=' + type);
}
export async function deletePost(fd) {
  await exigerAdmin();
  const sql = await getDb();
  const [p] = await sql`delete from posts where id = ${Number(fd.get('id')) || 0} returning type`;
  revalidatePath('/', 'layout');
  redirect('/admin/contenus?type=' + (p?.type || 'event'));
}

// ---------- Membres ----------
export async function setStatut(fd) {
  await exigerAdmin();
  const id = Number(fd.get('id')); const st = fd.get('statut') === 'revoked' ? 'revoked' : 'active';
  await (await getDb())`update members set status = ${st} where id = ${id}`;
  revalidatePath('/admin/membres/' + id);
  redirect('/admin/membres/' + id);
}
export async function updateMembre(prev, fd) {
  await exigerAdmin();
  const id = Number(fd.get('id'));
  const { ok, erreurs, data: d } = validerMembre(Object.fromEntries(fd), { admin: true });
  if (!ok) return { erreurs };
  const sql = await getDb();
  await sql`update members set nom = ${d.nom}, prenoms = ${d.prenoms}, naissance_date = ${d.naissance_date}, naissance_lieu = ${d.naissance_lieu}, fonction = ${d.fonction},
    profession = ${d.profession}, quartier = ${d.quartier}, telephone = ${d.telephone}, email = ${d.email}, urgence_nom = ${d.urgence_nom}, urgence_tel = ${d.urgence_tel}, piece_no = ${d.piece_no} where id = ${id}`;
  await regenererCarte(id);
  redirect('/admin/membres/' + id + '?maj=1');
}
export async function regenerer(fd) {
  await exigerAdmin();
  const id = Number(fd.get('id'));
  await regenererCarte(id);
  redirect('/admin/membres/' + id + '?maj=1');
}
export async function deleteMembre(fd) {
  await exigerAdmin();
  await (await getDb())`delete from members where id = ${Number(fd.get('id'))}`;
  redirect('/admin/membres');
}
export async function markRead(fd) {
  await exigerAdmin();
  await (await getDb())`update messages set is_read = true where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin/messages');
}
export async function deleteMessage(fd) {
  await exigerAdmin();
  await (await getDb())`delete from messages where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin/messages');
}
