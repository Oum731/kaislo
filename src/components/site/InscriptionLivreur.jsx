'use client';
// ------------------------------------------------------------
// INSCRIPTION D'UN LIVREUR KAISLO (lot L5) : affichée sur /livreurs/ seulement quand l'option « independants » est ouverte sur le serveur.
// Sinon, la page garde le contact par WhatsApp. L'équipe appelle le candidat avant de le valider.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { optionLivraison } from '@/lib/livraison';
import { PAYS } from '@/lib/donnees/modeles';
import { ChampTelephone, ChampVille } from '@/components/ui';
import { tr, tt } from '@/lib/i18n';

export default function InscriptionLivreur({ attente }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ nom: '', telephone: '', pays: 'MA', ville: '', vehicule: 'moto', conditionsAcceptees: false });
  const [erreur, setErreur] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { optionLivraison('independants').then(setOuvert); }, []);
  if (!ouvert) return attente;
  if (envoye) return <p className="info-verte">{tr('Merci ! Votre demande est reçue. L’équipe Kaislo vous appelle pour la valider.')}</p>;
  const maj = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const envoyer = async (e) => {
    e.preventDefault();
    setErreur('');
    setOccupe(true);
    try { await appelApi('POST', '/public/livreur/inscription', f); setEnvoye(true); } catch (x) { setErreur(x.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : x.message); }
    setOccupe(false);
  };
  return (
    <form className="pile" onSubmit={envoyer}>
      <label className="champ"><span>{tr('Votre nom')}</span><input value={f.nom} onChange={maj('nom')} required autoComplete="name" /></label>
      <label className="champ"><span>{tr('Pays')}</span>
        <select value={f.pays} onChange={(e) => setF({ ...f, pays: e.target.value, ville: '' })}>{PAYS.map((p) => <option key={p.id} value={p.id}>{tt(p.nom)}</option>)}</select>
      </label>
      <ChampTelephone libelle={tr('Votre numéro (WhatsApp)')} pays={f.pays} valeur={f.telephone} surChanger={(v) => setF({ ...f, telephone: v })} />
      <ChampVille libelle={tr('Votre ville')} pays={f.pays} valeur={f.ville} surChanger={(v) => setF((x) => ({ ...x, ville: v }))} />
      <label className="champ"><span>{tr('Moyen de transport')}</span>
        <select value={f.vehicule} onChange={maj('vehicule')}>
          <option value="moto">{tr('Moto')}</option><option value="velo">{tr('Vélo')}</option><option value="voiture">{tr('Voiture')}</option><option value="autre">{tr('Autre')}</option>
        </select>
      </label>
      <label className="ligne" style={{ gap: 8, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={f.conditionsAcceptees} onChange={maj('conditionsAcceptees')} />
        <span className="petit">{tr('Je travaille comme livreur indépendant : le prix de chaque course est fixé avec le commerçant, qui me paie, et Kaislo retient sa commission.')}</span>
      </label>
      {erreur && <p className="alerte">{erreur}</p>}
      <button className="btn grand" disabled={occupe || !f.conditionsAcceptees}>{tr('Envoyer ma demande')}</button>
    </form>
  );
}
