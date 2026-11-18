import postgres from 'postgres';

const SCHEMA = `
create table if not exists members (
  id serial primary key,
  number text unique not null,
  token text unique not null,
  nom text not null,
  prenoms text not null,
  naissance_date date not null,
  naissance_lieu text not null,
  fonction text not null default 'Membre',
  profession text not null default '—',
  quartier text not null default '—',
  telephone text not null,
  email text,
  urgence_nom text not null default '—',
  urgence_tel text not null,
  piece_no text not null default '—',
  photo bytea,
  pdf bytea,
  status text not null default 'active',
  valid_from date not null,
  valid_to date not null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists members_created on members (created_at desc);
create table if not exists posts (
  id serial primary key,
  type text not null check (type in ('event','action','activity')),
  title text not null,
  slug text unique not null,
  summary text not null default '',
  body text not null default '',
  event_date timestamptz,
  location text not null default '',
  image bytea,
  image_type text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists messages (
  id serial primary key,
  nom text not null,
  email text not null,
  message text not null,
  ip_hash text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
`;

let sql;
let ready;

export function dbConfigured() {
  return !!process.env.DATABASE_URL;
}

// Renvoie la connexion, après avoir créé les tables si besoin (une fois par démarrage).
export async function getDb() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL manquant : voir README.md');
    const local = /@(localhost|127\.0\.0\.1)/.test(url);
    sql = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 15, prepare: false, ssl: local ? false : 'require' });
  }
  if (!ready) ready = sql.unsafe(SCHEMA).catch((e) => { ready = null; throw e; });
  await ready;
  return sql;
}

// Pour les pages publiques : une panne de base ne doit pas casser le site vitrine.
export async function safe(fn, fallback) {
  try {
    if (!dbConfigured()) return fallback;
    return await fn(await getDb());
  } catch (e) {
    console.error('[db]', e.message);
    return fallback;
  }
}
