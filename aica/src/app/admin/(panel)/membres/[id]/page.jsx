import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import CardView from '@/components/CardView';
import MembreEdit from './MembreEdit';
import { membreParId } from '@/lib/members';
import { urlVerification } from '@/lib/card-pdf';
import { setStatut, regenerer, deleteMembre } from '../../../actions';

export default async function Fiche({ params, searchParams }) {
  const { id } = await params;
  const m = await membreParId(Number(id) || 0);
  if (!m) notFound();
  const maj = (await searchParams).maj;
  const qr = await QRCode.toDataURL(urlVerification(m.number), { margin: 1, width: 300 });
  const photo = `/api/admin/membres/${m.id}/photo`;
  return (
    <>
      <div className="rowhead"><h1>{m.prenoms} {m.nom.toUpperCase()} <small>{m.number}</small></h1><span className={'pill ' + (m.status === 'active' ? 'ok' : 'err')}>{m.status === 'active' ? 'Active' : 'Révoquée'}</span></div>
      {maj && <p className="ok banner">Carte mise à jour et enregistrée.</p>}
      <div className="cardpair"><CardView m={m} photoUrl={photo} /><CardView m={m} side="back" qr={qr} /></div>
      <div className="quick">
        <a className="btn" href={`/api/admin/membres/${m.id}/carte?telecharger`}>⬇ Télécharger le PDF</a>
        <a className="btn ghost" href={`/api/admin/membres/${m.id}/carte`} target="_blank">Ouvrir / imprimer</a>
        <form action={regenerer}><input type="hidden" name="id" value={m.id} /><button className="btn ghost">↻ Régénérer</button></form>
        <form action={setStatut}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="statut" value={m.status === 'active' ? 'revoked' : 'active'} /><button className="btn ghost">{m.status === 'active' ? '⛔ Révoquer la carte' : '✅ Réactiver'}</button></form>
      </div>
      <p className="hint">Lien personnel du membre : <code>/carte/{m.token}</code></p>
      <h2>Modifier les informations</h2>
      <MembreEdit m={m} />
      <form action={deleteMembre} className="danger"><input type="hidden" name="id" value={m.id} /><button className="btn danger small">Supprimer définitivement ce membre</button></form>
    </>
  );
}
