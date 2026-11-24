'use client';
// ------------------------------------------------------------
// LIVRAISON PAR LE COMMERÇANT (lot L2) : confier une commande à un de ses livreurs.
// Le livreur est une simple fiche (nom, numéro) : pas de compte. Il reçoit sur WhatsApp un lien propre à cette course, où il voit l'adresse et
// le montant, marque la commande récupérée, puis la livre avec le code que le client lui donne.
// ------------------------------------------------------------
import { useState } from 'react';
import { appelApi } from '@/lib/api';
import { ChampTelephone } from '@/components/ui';
import { cleNumero } from '@/lib/donnees/telephone';
import { tr } from '@/lib/i18n';

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
