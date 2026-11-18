import { getDb } from './db';
import { slugify } from './validate';

const COLS = `id, type, title, slug, summary, body, event_date, to_char(event_date at time zone 'Africa/Casablanca', 'YYYY-MM-DD"T"HH24:MI') as event_local, location, image_type, (image is not null) as has_image, published, created_at`;

export async function listerPosts(type, { admin = false, limit = 60, futur = null } = {}) {
  const sql = await getDb();
  const rows = await sql.unsafe(
    `select ${COLS} from posts where ($1 = '' or type = $1) and ($2 or published)
     and ($3::text is null or ($3 = 'futur' and event_date >= now() - interval '1 day') or ($3 = 'passe' and (event_date is null or event_date < now() - interval '1 day')))
     order by case when $3 = 'futur' then event_date end asc, coalesce(event_date, created_at) desc limit $4`,
    [type || '', admin, futur, limit]);
  return rows;
}
export async function postParSlug(slug, { admin = false } = {}) {
  const sql = await getDb();
  const [p] = await sql.unsafe(`select ${COLS} from posts where slug = $1 and ($2 or published)`, [slug, admin]);
  return p || null;
}
export async function postParId(id) {
  const sql = await getDb();
  const [p] = await sql.unsafe(`select ${COLS} from posts where id = $1`, [id]);
  return p || null;
}
export async function slugUnique(sql, titre, ignoreId = 0) {
  const base = slugify(titre);
  let s = base, i = 2;
  while ((await sql`select 1 from posts where slug = ${s} and id <> ${ignoreId}`).length) s = `${base}-${i++}`;
  return s;
}

const fmt = { dateStyle: 'full', timeZone: 'Africa/Casablanca' };
export const dateLongue = (d) => d ? new Intl.DateTimeFormat('fr-FR', fmt).format(new Date(d)) : '';
export const heure = (d) => d ? new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short', timeZone: 'Africa/Casablanca' }).format(new Date(d)) : '';
export const dateCourte = (d) => d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', timeZone: 'Africa/Casablanca' }).format(new Date(d)).replace('.', '') : '';
