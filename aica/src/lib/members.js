import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { getDb } from './db';
import { genererCartePdf } from './card-pdf';
import { SITE } from '@/config';

// Colonnes publiques (sans photo ni PDF, volumineux). Les dates sortent en texte AAAA-MM-JJ.
export const COLS = `id, number, token, nom, prenoms, naissance_date::text as naissance_date, naissance_lieu, fonction, profession, quartier,
  telephone, email, urgence_nom, urgence_tel, piece_no, status, valid_from::text as valid_from, valid_to::text as valid_to, created_at`;

export async function traiterPhoto(buffer) {
  return sharp(buffer, { failOn: 'none' }).rotate().resize(480, 640, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

const numero = (id, annee) => `AICA-${annee}-${String(id).padStart(4, '0')}`;

export async function creerMembre(data, photoBuf, ipHash) {
  const sql = await getDb();
  const doublon = await sql`select 1 from members where telephone = ${data.telephone} and naissance_date = ${data.naissance_date} limit 1`;
  if (doublon.length) return { doublon: true };
  if (ipHash) {
    const [{ n }] = await sql`select count(*)::int n from members where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`;
    if (n >= 5) return { limite: true };
  }
  const token = randomBytes(16).toString('hex');
  const photo = await traiterPhoto(photoBuf);
  const id = await sql.begin(async (tx) => {
    const [r] = await tx`
      insert into members (number, token, nom, prenoms, naissance_date, naissance_lieu, fonction, profession, quartier, telephone, email,
        urgence_nom, urgence_tel, piece_no, photo, valid_from, valid_to, ip_hash)
      values (${'tmp-' + token}, ${token}, ${data.nom}, ${data.prenoms}, ${data.naissance_date}, ${data.naissance_lieu}, ${data.fonction}, ${data.profession},
        ${data.quartier}, ${data.telephone}, ${data.email}, ${data.urgence_nom}, ${data.urgence_tel}, ${data.piece_no}, ${photo},
        current_date, (current_date + (${SITE.validiteMois} * interval '1 month'))::date, ${ipHash || null})
      returning id`;
    const [{ y }] = await tx`select extract(year from current_date)::int y`;
    await tx`update members set number = ${numero(r.id, y)} where id = ${r.id}`;
    return r.id;
  });
  await regenererCarte(id);
  const m = await membreParId(id);
  return { membre: m };
}

export async function regenererCarte(id) {
  const sql = await getDb();
  const [m] = await sql.unsafe(`select ${COLS}, photo from members where id = $1`, [id]);
  if (!m) return null;
  const { photo, ...reste } = m;
  const pdf = await genererCartePdf(reste, photo);
  await sql`update members set pdf = ${pdf} where id = ${id}`;
  return pdf;
}

export async function membreParId(id) {
  const sql = await getDb();
  const [m] = await sql.unsafe(`select ${COLS} from members where id = $1`, [id]);
  return m || null;
}
export async function membreParToken(token) {
  const sql = await getDb();
  const [m] = await sql.unsafe(`select ${COLS} from members where token = $1`, [String(token)]);
  return m || null;
}
export async function membreParNumero(n) {
  const sql = await getDb();
  const [m] = await sql.unsafe(`select ${COLS} from members where number = $1`, [String(n).toUpperCase()]);
  return m || null;
}
export async function listerMembres({ q = '', statut = '' } = {}) {
  const sql = await getDb();
  const like = `%${q.trim()}%`;
  return sql.unsafe(
    `select ${COLS} from members where ($1 = '%%' or nom ilike $1 or prenoms ilike $1 or number ilike $1 or telephone ilike $1)
     and ($2 = '' or status = $2) order by id desc limit 500`, [like, statut]);
}
