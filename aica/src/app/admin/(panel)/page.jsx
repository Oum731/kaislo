import Link from 'next/link';
import { getDb } from '@/lib/db';
import { listerMembres } from '@/lib/members';
import { fmtDate } from '@/lib/card-layout';

export default async function Dashboard() {
  const sql = await getDb();
  const [s] = await sql`select
    (select count(*)::int from members) as membres,
    (select count(*)::int from members where created_at > now() - interval '30 days') as recents,
    (select count(*)::int from posts where type = 'event' and published and event_date >= now()) as events,
    (select count(*)::int from messages where not is_read) as msgs`;
  const derniers = (await listerMembres({})).slice(0, 6);
  return (
    <>
      <h1>Tableau de bord</h1>
      <div className="stats">
        <Link href="/admin/membres" className="stat"><b>{s.membres}</b>membres</Link>
        <Link href="/admin/membres" className="stat"><b>{s.recents}</b>nouveaux (30 j)</Link>
        <Link href="/admin/contenus?type=event" className="stat"><b>{s.events}</b>événements à venir</Link>
        <Link href="/admin/messages" className="stat"><b>{s.msgs}</b>messages non lus</Link>
      </div>
      <div className="quick"><Link className="btn" href="/admin/contenus/nouveau?type=event">+ Événement</Link><Link className="btn" href="/admin/contenus/nouveau?type=action">+ Action</Link><Link className="btn" href="/admin/contenus/nouveau?type=activity">+ Activité</Link><Link className="btn ghost" href="/admin/membres/nouveau">+ Carte de membre</Link></div>
      <h2>Dernières cartes générées</h2>
      <table className="tbl"><tbody>{derniers.map((m) => <tr key={m.id}><td><Link href={`/admin/membres/${m.id}`}>{m.number}</Link></td><td>{m.prenoms} {m.nom}</td><td>{fmtDate(m.created_at)}</td></tr>)}{!derniers.length && <tr><td>Aucun membre pour l’instant.</td></tr>}</tbody></table>
    </>
  );
}
