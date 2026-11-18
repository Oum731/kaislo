import { notFound } from 'next/navigation';
import { SECTIONS } from '@/config';
import { safe } from '@/lib/db';
import { listerPosts } from '@/lib/posts';
import { PostCard } from '@/components/site/Chrome';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const s = SECTIONS[(await params).section];
  return s ? { title: s.titre, description: s.desc } : {};
}

export default async function Liste({ params }) {
  const key = (await params).section;
  const s = SECTIONS[key];
  if (!s) notFound();
  const ev = s.type === 'event';
  const [futurs, autres] = ev
    ? await Promise.all([safe(() => listerPosts('event', { futur: 'futur' }), []), safe(() => listerPosts('event', { futur: 'passe' }), [])])
    : [await safe(() => listerPosts(s.type), []), []];
  return (
    <div className="wrap page">
      <h1>{s.titre}</h1><p className="lead dark">{s.desc}</p>
      {ev && <h2 className="sub">À venir</h2>}
      {futurs.length ? <div className="pgrid">{futurs.map((p) => <PostCard key={p.id} p={p} section={key} />)}</div> : <p className="empty">{ev ? 'Aucun événement programmé pour le moment.' : 'Rien à afficher pour le moment.'}</p>}
      {ev && autres.length > 0 && (<><h2 className="sub">Événements passés</h2><div className="pgrid">{autres.map((p) => <PostCard key={p.id} p={p} section={key} />)}</div></>)}
    </div>
  );
}
