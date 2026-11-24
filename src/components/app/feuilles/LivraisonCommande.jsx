'use client';
// ------------------------------------------------------------
// LIVRAISON PAR LE COMMERÇANT (lot L2) : confier une commande à un de ses livreurs.
// Le livreur est une simple fiche (nom, numéro) : pas de compte. Il reçoit sur WhatsApp un lien propre à cette course, où il voit l'adresse et
// le montant, marque la commande récupérée, puis la livre avec le code que le client lui donne.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { ChampTelephone } from '@/components/ui';
import { cleNumero } from '@/lib/donnees/telephone';
import { tr } from '@/lib/i18n';
import { formatPrix } from '@/lib/utils/format';

const STATUTS_LIVRABLES = ['confirmee', 'prete', 'en_route'];

export function BlocLivraison({ commande: c, jeton, pays, surChange, surErreur }) {
  const [ouvert, setOuvert] = useState(false);
  const [livreurs, setLivreurs] = useState(null);
  const [ajout, setAjout] = useState(null); // { nom, telephone } pendant la création d'un livreur
  const [occupe, setOccupe] = useState(false);
  if (c.mode !== 'livraison' || !STATUTS_LIVRABLES.includes(c.statut)) return null;

  const erreur = (e) => surErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message);
  const ouvrir = async () => {
    setOuvert(true);
    if (!livreurs) try { setLivreurs((await appelApi('GET', '/livreurs', null, jeton)).livreurs); } catch (e) { erreur(e); }
  };
  const assigner = async (livreur) => {
    setOccupe(true);
    try {
      const r = await appelApi('POST', '/commandes-en-ligne/assigner', { id: c.id, livreurId: livreur.id }, jeton);
      surChange(r.commande);
      setOuvert(false);
    } catch (e) { erreur(e); }
    setOccupe(false);
  };
  const creer = async () => {
    setOccupe(true);
    try {
      const r = await appelApi('POST', '/livreurs', ajout, jeton);
      setLivreurs((l) => [...(l || []), r.livreur]);
      setAjout(null);
    } catch (e) { erreur(e); }
    setOccupe(false);
  };
  const retirer = async (l) => {
    try {
      await appelApi('POST', '/livreurs', { ...l, actif: false }, jeton);
      setLivreurs((x) => x.map((y) => (y.id === l.id ? { ...y, actif: false } : y)));
    } catch (e) { erreur(e); }
  };

  const envoi = c.livreur && c.lienCourse
    ? 'https://wa.me/' + cleNumero(c.livreur.telephone, pays) + '?text=' + encodeURIComponent(tr('Course n° {0} : {1}. Ouvrez ce lien pour voir l’adresse et le montant, puis validez la remise avec le code du client : {2}', [c.numero, c.client.nom, c.lienCourse]))
    : null;

  return (
    <div className="carte pile">
      <b>{tr('Livraison')}</b>
      {c.livreur ? <p className="petit">{tr('Livreur : {0}', [c.livreur.nom])}{c.statut === 'en_route' ? ' · ' + tr('en route') : ''}</p> : <p className="petit muet">{tr('Aucun livreur pour cette commande.')}</p>}
      {c.position && <a className="btn secondaire" href={`https://www.openstreetmap.org/?mlat=${c.position.lat}&mlon=${c.position.lng}#map=16/${c.position.lat}/${c.position.lng}`} target="_blank" rel="noreferrer">{tr('Voir le livreur sur la carte')}</a>}
      {envoi && <a className="btn secondaire" style={{ height: 'auto', minHeight: 44, whiteSpace: 'normal', textAlign: 'center' }} href={envoi} target="_blank" rel="noreferrer">{tr('Envoyer la course à {0} sur WhatsApp', [c.livreur.nom])}</a>}
      {!ouvert && <button className="btn secondaire" onClick={ouvrir}>{c.livreur ? tr('Changer de livreur') : tr('Assigner un livreur')}</button>}
      {ouvert && (
        <div className="pile">
          {(livreurs || []).filter((l) => l.actif).map((l) => (
            <div key={l.id} className="ligne" style={{ gap: 8, justifyContent: 'space-between' }}>
              <button className="btn petit" disabled={occupe} onClick={() => assigner(l)}>{l.nom}</button>
              <span className="petit muet grandit">{l.telephone}</span>
              <button className="lien petit" onClick={() => retirer(l)}>{tr('Retirer')}</button>
            </div>
          ))}
          {livreurs && !livreurs.some((l) => l.actif) && !ajout && <p className="petit muet">{tr('Vous n’avez pas encore de livreur : ajoutez-en un.')}</p>}
          {!ajout && <button className="btn secondaire" onClick={() => setAjout({ nom: '', telephone: '' })}>{tr('Ajouter un livreur')}</button>}
          {ajout && (
            <div className="pile">
              <label className="champ"><span>{tr('Nom du livreur')}</span><input value={ajout.nom} onChange={(e) => setAjout({ ...ajout, nom: e.target.value })} /></label>
              <ChampTelephone libelle={tr('Numéro du livreur (WhatsApp)')} pays={pays} valeur={ajout.telephone} surChanger={(v) => setAjout({ ...ajout, telephone: v })} />
              <div className="grille-2">
                <button className="btn secondaire" onClick={() => setAjout(null)}>{tr('Annuler')}</button>
                <button className="btn" disabled={occupe} onClick={creer}>{tr('Enregistrer le livreur')}</button>
              </div>
            </div>
          )}
          <button className="lien petit" onClick={() => setOuvert(false)}>{tr('Fermer')}</button>
        </div>
      )}
    </div>
  );
}

const LIBELLE_PAIEMENT = () => ({ a_payer: tr('En attente de paiement'), echoue: tr('Paiement échoué'), paye: tr('Payée en ligne'), a_rembourser: tr('À rembourser'), rembourse: tr('Remboursée') });

// Paiement en ligne (lot L4) : état du paiement d'une commande, et remboursement quand elle est annulée
export function BlocPaiement({ commande: c, jeton, surChange, surErreur }) {
  const [occupe, setOccupe] = useState(false);
  const rembourser = async () => {
    if (!confirm(tr('Rembourser cette commande au client ? Le prestataire de paiement lui rend son argent.'))) return;
    setOccupe(true);
    try { surChange((await appelApi('POST', '/commandes-en-ligne/rembourser', { id: c.id }, jeton)).commande); } catch (e) { surErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message); }
    setOccupe(false);
  };
  const statut = c.paiement.statut;
  return (
    <div className={statut === 'paye' || statut === 'rembourse' ? 'info-verte' : 'carte pile'}>
      <b>{LIBELLE_PAIEMENT()[statut] || statut}</b>
      {['a_payer', 'echoue'].includes(statut) && <p className="petit muet">{tr('Vous pourrez accepter la commande dès que le paiement est confirmé.')}</p>}
      {['paye', 'a_rembourser'].includes(statut) && c.statut === 'annulee' && <button className="btn secondaire" disabled={occupe} onClick={rembourser}>{tr('Rembourser le client')}</button>}
      {statut === 'paye' && c.statut !== 'annulee' && <p className="tres-petit muet">{tr('Si vous annulez cette commande, vous pourrez rembourser le client ici.')}</p>}
    </div>
  );
}

// Ce que le prestataire doit reverser au commerçant (commissions déduites)
export function ResumePaiements({ jeton }) {
  const [r, setR] = useState(null);
  useEffect(() => { appelApi('GET', '/paiements-en-ligne', null, jeton).then(setR).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r || !r.paiements.length) return null;
  return (
    <div className="carte pile">
      <b>{tr('Paiements en ligne')}</b>
      <p className="petit">{tr('À vous reverser par le prestataire : {0}', [formatPrix(r.aReverser, r.devise)])}</p>
      <p className="tres-petit muet">{tr('Après commission. Le prestataire vous verse l’argent directement : Kaislo ne le touche pas.')}</p>
    </div>
  );
}
