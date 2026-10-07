'use client';
// ------------------------------------------------------------
// Plusieurs commerces pour un gérant : liste (avec le total des abonnements) et ajout d'un commerce.
// Chaque activité (épicerie, restaurant…) est un commerce à part : son abonnement, son stock, ses ventes et ses
// comptes du soir ne se mélangent pas avec ceux des autres.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone } from '@/components/ui';
import { TYPES_COMMERCE } from '@/lib/donnees/modeles';
import { etatAbonnement, LIBELLES_STATUT } from '@/lib/donnees/abonnement';
import { formuleDuType, prixAbonnement, catalogueEnVigueur, REGLES_TARIFS } from '@/lib/donnees/tarifs';
import { formatPrix } from '@/lib/utils/format';
import { chemin } from '@/config';
import { tr, tt } from '@/lib/i18n';

const libelleType = (id) => tt(TYPES_COMMERCE.find((t) => t.id === id)?.nom || id);

// ---------- Liste des commerces et total ----------
export function FeuilleCommerces() {
  const s = useKaislo();
  const [erreur, setErreur] = useState('');
  useEffect(() => { s.chargerMesCommerces(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const demo = s.estDemoActuel();
  const c0 = s.d.commerce;
  // Démo : le commerce de démonstration + ceux qu'on ajoute pour essayer (rien n'est enregistré)
  const liste = demo
    ? [{ commerceId: c0.id, nom: c0.nom, type: c0.type, ville: c0.ville, abonnement: c0.abonnement, tarif: { devise: c0.devise, remiseMulti: 0, parMois: prixAbonnement({ formule: formuleDuType(c0.type), devise: c0.devise, mode: catalogueEnVigueur() ? 'catalogue' : 'base' }).parMois } }, ...s.commercesDemo]
    : s.commercesGerant();
  const totaux = {};
  for (const c of liste) totaux[c.tarif.devise] = (totaux[c.tarif.devise] || 0) + c.tarif.parMois;
  const ouvrir = async (id) => { setErreur(''); if (demo) return id === c0.id ? s.fermer() : setErreur(tr('Démo : avec un vrai compte, ce commerce s’ouvrirait ici avec son propre stock et ses propres ventes.')); const e = await s.basculerCommerce(id); if (e) setErreur(e); };
  return (
    <Feuille titre={tr('Mes commerces')} surFermer={s.fermer} pied={<button className="btn bloc" onClick={() => s.ouvrir('ajoutCommerce')}><Icone nom="plus" /> {tr('Ajouter un commerce')}</button>}>
      <div className="pile">
        <p className="petit muet">{tr('Un seul numéro et un seul code PIN pour tous vos commerces. Chaque activité a son propre abonnement, son stock, ses ventes et ses comptes du soir : rien ne se mélange.')}</p>
        {demo && <p className="info-verte petit">{tr('Démo : essayez d’ajouter un commerce pour voir le prix et le total. Rien n’est créé.')}</p>}
        {erreur && <p className="alerte">{erreur}</p>}
        <div className="liste">
          {liste.map((c) => {
            const etat = etatAbonnement(c.abonnement);
            const courant = c.commerceId === s.d.commerce.id;
            return (
              <button key={c.commerceId} className="liste-item" onClick={() => ouvrir(c.commerceId)} disabled={s.connexionEnCours}>
                <span className="mini-emoji teinte-vert"><Icone nom={courant ? 'ok' : 'caisse'} /></span>
                <span className="grandit" style={{ textAlign: 'left' }}>
                  <b>{c.nom}</b>
                  <span className="petit muet" style={{ display: 'block' }}>{libelleType(c.type)} · {c.ville}</span>
                  <span className="tres-petit muet" style={{ display: 'block' }}>
                    {tr('{0} par mois', [formatPrix(c.tarif.parMois, c.tarif.devise)])}{c.tarif.remiseMulti > 0 ? ' · ' + tr('remise de {0} % comprise', [c.tarif.remiseMulti]) : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge ${{ essai: 'safran', actif: '', expire: 'rouge', suspendu: 'rouge' }[etat.statut]}`}>{tr(LIBELLES_STATUT[etat.statut])}</span>
                  {courant && <span className="tres-petit muet">{tr('Ouvert')}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {liste.length > 1 && (
          <div className="carte pile">
            <p className="petit muet">{tr('Total de tous vos abonnements')}</p>
            {Object.entries(totaux).map(([devise, montant]) => <b key={devise} style={{ fontSize: 22 }}>{tr('{0} par mois', [formatPrix(montant, devise)])}</b>)}
            <p className="tres-petit muet">{tr('Vous payez tout en une seule fois : demandez-le à l’équipe Kaislo (bouton « Discuter avec nous »). Chaque commerce garde ses propres rapports de ventes.')}</p>
          </div>
        )}
      </div>
    </Feuille>
  );
}

// ---------- Ajouter un commerce ----------
export function FeuilleAjoutCommerce() {
  const s = useKaislo();
  const [f, setF] = useState({ nom: '', type: 'epicerie', ville: s.d.commerce.ville || '', pin: '', accepte: false });
  const [erreur, setErreur] = useState('');
  const demo = s.estDemoActuel();
  const devise = s.d.commerce.devise;
  const formule = formuleDuType(f.type);
  // Le commerce ajouté est au moins le 2e : remise multi-commerce
  // Un commerce ajouté n'a pas de code parrain : il suit le prix catalogue quand celui-ci est en vigueur
  const prix = prixAbonnement({ formule, devise, multi: true, mode: catalogueEnVigueur() ? 'catalogue' : 'base' }).parMois;
  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!f.accepte && !demo) return setErreur(tr('Merci d’accepter les conditions d’utilisation pour continuer'));
    const err = await s.ajouterCommerce(f);
    if (err) setErreur(err);
  };
  return (
    <Feuille titre={tr('Ajouter un commerce')} surFermer={s.fermer}>
      <form className="pile" onSubmit={valider}>
        <p className="petit muet">{tr('Une activité = un commerce. Une épicerie et un restaurant sont deux commerces : chacun a son stock, ses ventes et son abonnement, au tarif de son métier.')}</p>
        <label className="champ"><span>{tr('Nom du commerce')}</span><input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder={tr('Ex : Chez Awa Restaurant')} autoFocus /></label>
        <label className="champ"><span>{tr('Activité')}</span>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {TYPES_COMMERCE.map((t) => <option key={t.id} value={t.id}>{tt(t.nom)}</option>)}
          </select>
        </label>
        <label className="champ"><span>{tr('Ville')}</span><input value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} /></label>
        <div className="carte pile">
          <p className="petit muet">{tr('Abonnement de ce commerce')}</p>
          <b>{tr('{0} · environ {1} par mois', [tr(formule.nom), formatPrix(prix, devise)])}</b>
          <p className="tres-petit muet">{tr('Remise de {0} % déjà comprise (2e commerce et suivants). Essai gratuit de 30 jours pour chaque nouveau commerce.', [REGLES_TARIFS.remiseMultiCommerce])}</p>
        </div>
      {!demo && <>
        <label className="champ"><span>{tr('Votre code PIN (pour confirmer)')}</span>
          <input className="pin-saisie" type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} placeholder="••••" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        </label>
        <label className="case-accord">
          <input type="checkbox" checked={f.accepte} onChange={(e) => setF({ ...f, accepte: e.target.checked })} />
          <span>{tr('J’accepte les')} <a href={chemin('/conditions-utilisation/')} target="_blank" rel="noreferrer">{tr('conditions d’utilisation')}</a> {tr('de Kaislo.')}</span>
        </label>
      </>}
        {erreur && <p className="alerte">{erreur}</p>}
        <button type="submit" className="btn grand bloc" disabled={s.connexionEnCours}>{s.connexionEnCours ? tr('Création…') : tr('Créer ce commerce')}</button>
      </form>
    </Feuille>
  );
}
