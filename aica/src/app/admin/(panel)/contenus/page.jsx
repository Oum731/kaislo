import Link from 'next/link';
import { SECTIONS, TYPE_TO_SECTION } from '@/config';
import { listerPosts, dateLongue } from '@/lib/posts';

export default async function Contenus({ searchParams }) {
  const type = (await searchParams).type || 'event';
  const sec = SECTIONS[TYPE_TO_SECTION[type]] || SECTIONS.evenements;
  const rows = await listerPosts(sec.type, { admin: true, limit: 200 });
  return (
    <>
      <div className="rowhead"><h1>{sec.titre}</h1><Link className="btn" href={`/admin/contenus/nouveau?type=${sec.type}`}>+ Ajouter</Link></div>
      <div className="tablewrap"><table className="tbl"><thead><tr><th>Titre</th><th>Date</th><th>Statut</th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id}><td><Link href={`/admin/contenus/${p.id}`}>{p.title}</Link></td><td>{p.event_date ? dateLongue(p.event_date) : '—'}</td><td><span className={'pill ' + (p.published ? 'ok' : 'warn')}>{p.published ? 'Publié' : 'Brouillon'}</span></td></tr>)}
        {!rows.length && <tr><td colSpan="3">Rien pour le moment. Cliquez sur « Ajouter ».</td></tr>}
      </tbody></table></div>
    </>
  );
}
