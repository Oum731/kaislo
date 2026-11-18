import { getDb } from '@/lib/db';
import { markRead, deleteMessage } from '../../actions';

export default async function Messages() {
  const sql = await getDb();
  const rows = await sql`select * from messages order by created_at desc limit 200`;
  return (
    <>
      <h1>Messages reçus</h1>
      {rows.map((m) => (
        <article key={m.id} className={'msg' + (m.is_read ? '' : ' new')}>
          <header><b>{m.nom}</b> · <a href={`mailto:${m.email}`}>{m.email}</a> · <time>{new Date(m.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })}</time></header>
          <p>{m.message}</p>
          <div className="quick">{!m.is_read && <form action={markRead}><input type="hidden" name="id" value={m.id} /><button className="btn small ghost">Marquer comme lu</button></form>}<form action={deleteMessage}><input type="hidden" name="id" value={m.id} /><button className="btn small danger">Supprimer</button></form></div>
        </article>))}
      {!rows.length && <p className="empty">Aucun message.</p>}
    </>
  );
}
