'use client';
// ------------------------------------------------------------
// « Donner mon avis sur Kaislo » : note de 1 à 5 étoiles + quelques lignes. Réservé au gérant connecté (un avis par commerce).
// L'avis est relu par l'équipe avant d'apparaître sur le site, avec le prénom, la ville et l'activité (jamais le numéro).
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { tr } from '@/lib/i18n';

const MIN = 20;
const MAX = 600;
const LIBELLE_NOTE = () => [tr('Décevant'), tr('Moyen'), tr('Correct'), tr('Très bien'), tr('Excellent')];

export function EtoilesNote({ valeur, surChanger }) {
  const libelles = LIBELLE_NOTE();
  return (
    <div className="etoiles-note" role="radiogroup" aria-label={tr('Votre note')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valeur === n} aria-label={`${n} / 5 · ${libelles[n - 1]}`} className={n <= valeur ? 'plein' : ''} onClick={() => surChanger(n)}>
          <Icone nom="etoile" />
        </button>
      ))}
    </div>
  );
}

export function FeuilleAvis() {
  const s = useKaislo();
  const demo = s.estDemoActuel();
  const [f, setF] = useState({ note: 0, texte: '', autorisation: false });
  const [etat, setEtat] = useState(null); // avis déjà envoyé : { statut, note, texte }
  const [chargement, setChargement] = useState(!demo);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);

  useEffect(() => {
    if (demo) return;
    appelApi('GET', '/mon-avis', null, s.jetonServeur())
      .then((rep) => { if (rep.avis) { setEtat(rep.avis); setF((x) => ({ ...x, note: rep.avis.note, texte: rep.avis.texte })); } })
      .catch(() => {})
      .finally(() => setChargement(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restant = MIN - f.texte.trim().length;
  const pret = f.note > 0 && restant <= 0 && f.autorisation;
  const envoyer = async (e) => {
    e.preventDefault();
    setErreur('');
    if (demo) return setErreur(tr('Démo : avec un vrai compte, votre avis serait envoyé à l’équipe Kaislo.'));
    setEnvoi(true);
    try {
      await appelApi('POST', '/avis', f, s.jetonServeur());
      setFait(true);
    } catch (err) {
      setErreur(err.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : err.message);
    }
    setEnvoi(false);
  };

  if (fait) {
    return (
      <Feuille titre={tr('Merci !')} surFermer={s.fermer} pied={<button className="btn bloc" onClick={s.fermer}>{tr('Fermer')}</button>}>
        <div className="pile" style={{ textAlign: 'center', padding: '12px 0' }}>
          <span className="mini-emoji teinte-vert" style={{ margin: '0 auto' }}><Icone nom="ok" /></span>
          <p><b>{tr('Votre avis est bien reçu.')}</b></p>
          <p className="petit muet">{tr('Notre équipe le relit avant de le publier sur le site. Vous pouvez le modifier à tout moment.')}</p>
        </div>
      </Feuille>
    );
  }
  const statut = etat && { attente: tr('En attente de relecture'), publie: tr('Publié sur le site'), refuse: tr('Non publié') }[etat.statut];
  return (
    <Feuille titre={tr('Votre avis sur Kaislo')} surFermer={s.fermer} pied={
      <button type="submit" form="form-avis" className="btn grand bloc" disabled={!pret || envoi}>{envoi ? tr('Envoi…') : etat ? tr('Mettre à jour mon avis') : tr('Envoyer mon avis')}</button>
    }>
      <form id="form-avis" className="pile" onSubmit={envoyer}>
        <p className="petit muet">{tr('Votre expérience aide d’autres commerçants à choisir. Soyez honnête : bon ou moins bon, nous lisons tout.')}</p>
        {statut && <p className="info-verte petit">{tr('Votre avis actuel')} : {statut}</p>}
        {chargement ? null : (
          <>
            <div className="champ">
              <span>{tr('Votre note')}</span>
              <EtoilesNote valeur={f.note} surChanger={(note) => setF({ ...f, note })} />
            </div>
            <label className="champ"><span>{tr('Votre avis')}</span>
              <textarea rows={5} maxLength={MAX} value={f.texte} onChange={(e) => setF({ ...f, texte: e.target.value })} placeholder={tr('Ex : ce que vous faites avec Kaislo, ce qui a changé dans votre commerce, ce que vous aimeriez en plus…')} />
              <span className="tres-petit muet" style={{ margin: '4px 0 0' }}>{restant > 0 ? tr('Encore {0} caractères au minimum', [restant]) : `${f.texte.trim().length} / ${MAX}`}</span>
            </label>
            <label className="case-accord">
              <input type="checkbox" checked={f.autorisation} onChange={(e) => setF({ ...f, autorisation: e.target.checked })} />
              <span>{tr('J’accepte que mon avis soit affiché sur kaislo.com avec mon prénom, la première lettre de mon nom, ma ville et mon activité.')}</span>
            </label>
          </>
        )}
        {erreur && <p className="alerte">{erreur}</p>}
      </form>
    </Feuille>
  );
}
