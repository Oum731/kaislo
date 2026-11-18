import Link from 'next/link';
import { listerMembres } from '@/lib/members';
import { fmtTel } from '@/lib/validate';
import { fmtDate } from '@/lib/card-layout';

export default async function Membres({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || ''), statut = String(sp.statut || '');
  const rows = await listerMembres({ q, statut });
  return (
    <>
      <div className="rowhead"><h1>Membres & cartes <small>({rows.length})</small></h1><div><Link className="btn" href="/admin/membres/nouveau">+ Nouvelle carte</Link> <a className="btn ghost" href="/api/admin/export">⬇ Export Excel (CSV)</a></div></div>
      <form className="filters"><input name="q" defaultValue={q} placeholder="Rechercher : nom, n° de carte, téléphone…" /><select name="statut" defaultValue={statut}><option value="">Tous</option><option value="active">Actifs</option><option value="revoked">Révoqués</option></select><button className="btn small">Filtrer</button></form>
      <div className="tablewrap"><table className="tbl">
        <thead><tr><th>N°</th><th>Nom</th><th>Téléphone</th><th>Fonction</th><th>Valable jusqu’au</th><th>Statut</th><th></th></tr></thead>
        <tbody>{rows.map((m) => (
          <tr key={m.id}><td><Link href={`/admin/membres/${m.id}`}>{m.number}</Link></td><td>{m.nom.toUpperCase()} {m.prenoms}</td><td>{fmtTel(m.telephone)}</td><td>{m.fonction}</td><td>{fmtDate(m.valid_to)}</td>
            <td><span className={'pill ' + (m.status === 'active' ? 'ok' : 'err')}>{m.status === 'active' ? 'Actif' : 'Révoqué'}</span></td>
            <td><a href={`/api/admin/membres/${m.id}/carte?telecharger`}>PDF</a></td></tr>))}
          {!rows.length && <tr><td colSpan="7">Aucun résultat.</td></tr>}</tbody></table></div>
    </>
  );
}
