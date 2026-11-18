import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTIONS } from '@/config';
import { safe } from '@/lib/db';
import { postParSlug, dateLongue, heure } from '@/lib/posts';

export const dynamic = 'force-dynamic';

async function charger(params) {
  const { section, slug } = await params;
  const s = SECTIONS[section];
  if (!s) return {};
  const p = await safe(() => postParSlug(slug), null);
  return { s, section, p: p && p.type === s.type ? p : null };
}

export async function generateMetadata({ params }) {
  const { p } = await charger(params);
  return p ? { title: p.title, description: p.summary || undefined, openGraph: p.has_image ? { images: [`/api/media/${p.id}`] } : undefined } : {};
}

export default async function Detail({ params }) {
  const { s, section, p } = await charger(params);
  if (!p) notFound();
  return (
    <article className="wrap page narrow">
      <Link href={`/${section}`} className="back">← {s.titre}</Link>
      <h1>{p.title}</h1>
      <p className="meta">
        {p.event_date && <span>📅 {dateLongue(p.event_date)}{heure(p.event_date) !== '00:00' && ` à ${heure(p.event_date)}`}</span>}
        {p.location && <span>📍 {p.location}</span>}
      </p>
      {p.has_image && <img className="cover" src={`/api/media/${p.id}`} alt="" />}
      {p.summary && <p className="lead dark">{p.summary}</p>}
      <div className="prose">{p.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
      {p.type === 'event' && <div className="joincard slim"><p>Pas encore membre ? Obtenez votre carte AICA en 2 minutes.</p><Link className="btn" href="/adhesion">Devenir membre</Link></div>}
    </article>
  );
}
