'use client';
// ------------------------------------------------------------
// « Payer mon abonnement » : le gérant voit les numéros de paiement mobile (Orange Money…) de l'équipe Kaislo avec le prix dans sa devise, et les comptes bancaires
// avec le montant exact à virer dans la devise du compte, plus la référence à indiquer. « J'ai payé » / « J'ai fait le virement » prévient l'équipe par la messagerie (écran Aide).
// L'équipe enregistre ensuite le paiement dans l'espace Kaislo (moyen « Virement »). Voir api/lib/virement.php.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { symbole } from '@/lib/utils/format';
import { chemin } from '@/config';
import { qrDataUrl } from '@/lib/qr';
import { tr } from '@/lib/i18n';

const montant = (x, devise) => Math.round(x).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' ' + symbole(devise);
const groupes = (iban) => iban.replace(/(.{4})/g, '$1 ').trim(); // FR76 3000 6000 …

function Ligne({ libelle, valeur, copie, surCopier }) {
  return (
    <div className="ligne espace" style={{ gap: 8 }}>
      <span style={{ minWidth: 0 }}>
        <span className="tres-petit muet bloc-texte">{libelle}</span>
        <b style={{ wordBreak: 'break-all' }}>{valeur}</b>
      </span>
      {surCopier && <button className="btn secondaire petit" onClick={surCopier}>{copie ? tr('Copié') : tr('Copier')}</button>}
    </div>
  );
}

// Code QR de paiement d'un moyen mobile :
//  - lien de paiement (Wave) : un code créé ici avec le montant de la formule (1 mois ou 12 mois) : le montant s'affiche tout seul à l'ouverture dans l'application ;
//    sur téléphone, on ne peut pas scanner son propre écran : le bouton ouvre le même lien d'un geste. Le code fixe (sans montant) reste en secours ;
//  - sinon, code fixe (image du site) : le gérant saisit le montant de sa formule.
function BlocPaiementQr({ m }) {
  const [mois, setMois] = useState(1);
  const liens = m.liens || [];
  const lien = liens.find((l) => l.mois === mois) || liens[0];
  const image = (src, alt) => <img src={src} alt={alt} width={240} height={240} style={{ maxWidth: '100%', height: 'auto', borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff' }} />;
  if (lien) {
    return (
      <div className="pile" style={{ alignItems: 'center', gap: 8 }}>
        <div className="puces" style={{ justifyContent: 'center' }}>
          {liens.map((l) => <button key={l.mois} className={`puce ${l.mois === lien.mois ? 'actif' : ''}`} onClick={() => setMois(l.mois)}>{l.mois === 1 ? tr('1 mois') : tr('12 mois')} · {montant(l.montant, m.devise)}</button>)}
        </div>
        {image(qrDataUrl(lien.url), tr('Code QR {0} avec le montant', [m.operateur]))}
        <p className="petit" style={{ textAlign: 'center' }}>{tr('Scannez ce code avec l’application {0} : le montant de votre formule ({1}) s’affiche tout seul. Vérifiez-le avant de confirmer.', [m.operateur, montant(lien.montant, m.devise)])}</p>
        <a className="btn bloc" href={lien.url} target="_blank" rel="noreferrer"><Icone nom="billet" /> {tr('Sur ce téléphone : payer {0} avec {1}', [montant(lien.montant, m.devise), m.operateur])}</a>
        <p className="tres-petit muet" style={{ textAlign: 'center' }}>{tr('Sur ce même téléphone, vous ne pouvez pas scanner votre propre écran : touchez le bouton ci-dessus.')}</p>
        {m.qr && (
          <details style={{ width: '100%' }}>
            <summary className="petit muet" style={{ cursor: 'pointer', textAlign: 'center' }}>{tr('Le montant ne s’affiche pas ? Utiliser le code fixe')}</summary>
            <div className="pile" style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
              {image(chemin(m.qr), tr('Code QR {0}', [m.operateur]))}
              <p className="tres-petit muet" style={{ textAlign: 'center' }}>{tr('Scannez ce code, puis saisissez {0} vous-même.', [montant(lien.montant, m.devise)])}</p>
            </div>
          </details>
        )}
      </div>
    );
  }
  if (!m.qr) return null;
  return (
    <div className="pile" style={{ alignItems: 'center', gap: 8 }}>
      {image(chemin(m.qr), tr('Code QR {0}', [m.operateur]))}
      <p className="petit" style={{ textAlign: 'center' }}>{tr('Scannez ce code avec l’application {0} pour payer, puis saisissez le montant de votre formule : {1} par mois ou {2} à l’année.', [m.operateur, montant(m.parMois, m.devise), montant(m.annuel, m.devise)])}</p>
      <p className="tres-petit muet" style={{ textAlign: 'center' }}>{tr('Sur ce même téléphone, vous ne pouvez pas scanner votre propre écran : ouvrez ce code sur un autre écran, ou écrivez-nous (écran Aide) pour recevoir un lien de paiement.')}</p>
    </div>
  );
}

export function FeuilleVirement() {
  const s = useKaislo();
  const [r, setR] = useState(null);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [envoyeMobile, setEnvoyeMobile] = useState(false);
  const [expediteur, setExpediteur] = useState(''); // numéro depuis lequel le gérant a payé en mobile money (aide l'équipe à retrouver le paiement)

  useEffect(() => {
    appelApi('GET', '/paiement-virement', null, s.jetonServeur())
      .then(setR)
      .catch((e) => setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copier = async (cle, texte) => {
    try { await navigator.clipboard.writeText(texte); setCopie(cle); setTimeout(() => setCopie(''), 2000); } catch { setErreur(tr('Copie impossible : recopiez à la main.')); }
  };

  // Prévient l'équipe (messagerie) : elle retrouve le virement grâce à la référence et enregistre le paiement
  const prevenir = async (compte) => {
    setErreur('');
    try {
      // Message pour l'équipe Kaislo : toujours en français, quelle que soit la langue de l'application
      await appelApi('POST', '/messages', { texte: `J’ai fait un virement (compte en ${compte.devise}, ${montant(compte.parMois, compte.devise)} par mois). Référence : ${r.reference}.` }, s.jetonServeur());
      setEnvoye(true);
    } catch (e) { setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message); }
  };

  // Paiement mobile : prévient l'équipe avec le numéro d'envoi (facultatif) et la référence
  const prevenirMobile = async (m) => {
    setErreur('');
    try {
      await appelApi('POST', '/messages', { texte: `J’ai payé par ${m.operateur}${m.numero ? ' au ' + m.numero : ''} (${montant(m.parMois, m.devise)} par mois).${expediteur.trim() ? ` Numéro d’envoi : ${expediteur.trim().slice(0, 30)}.` : ''} Référence : ${r.reference}.` }, s.jetonServeur());
      setEnvoyeMobile(true);
    } catch (e) { setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message); }
  };

  return (
    <Feuille titre={tr('Payer mon abonnement')} surFermer={s.fermer} pleine large>
      <div className="pile">
        {erreur && <p className="alerte">{erreur}</p>}
        {!r && !erreur && <p className="muet petit">{tr('Chargement…')}</p>}
        {r && !r.comptes.length && !(r.mobiles || []).length && <p className="astuce">{tr('Le paiement en ligne n’est pas encore disponible ici. Écrivez-nous (écran Aide) : nous vous donnons les coordonnées de paiement.')}</p>}
        {r && (r.mobiles || []).length > 0 && (
          <>
            {r.mobiles.map((m, i) => (
              <div key={'m' + i} className="carte pile">
                <div className="ligne espace">
                  <b>{tr('Payer par {0}', [m.operateur])}</b>
                  <span className="badge safran">{montant(m.parMois, m.devise)} {tr('par mois')}</span>
                </div>
                <p className="petit muet">{tr('À l’année : {0} ({1} mois offerts).', [montant(m.annuel, m.devise), 2])}</p>
                <BlocPaiementQr m={m} />
                {m.numero && <Ligne libelle={m.liens?.length ? tr('Ou envoyez au numéro') : tr('Envoyez au numéro')} valeur={m.numero} copie={copie === 'num' + i} surCopier={() => copier('num' + i, m.numero)} />}
                {m.titulaire && <Ligne libelle={tr('Au nom de')} valeur={m.titulaire} />}
                <Ligne libelle={tr('Référence à indiquer si possible')} valeur={r.reference} copie={copie === 'refm' + i} surCopier={() => copier('refm' + i, r.reference)} />
                {m.note && <p className="petit muet">{m.note}</p>}
                <label className="champ"><span>{tr('Numéro depuis lequel vous avez payé (facultatif)')}</span><input type="tel" inputMode="tel" value={expediteur} onChange={(e) => setExpediteur(e.target.value)} maxLength={30} /></label>
                <button className="btn bloc" onClick={() => prevenirMobile(m)} disabled={envoyeMobile}><Icone nom="ok" /> {envoyeMobile ? tr('L’équipe est prévenue') : tr('J’ai payé')}</button>
              </div>
            ))}
            <p className="tres-petit muet">{tr('Votre abonnement est prolongé dès que l’équipe a vu le paiement. Gardez le message de confirmation de l’opérateur.')}</p>
          </>
        )}
        {r && r.comptes.length > 0 && (
          <>
            <p className="info-verte"><b>{tr('Dans le motif du virement, écrivez :')}</b> <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>{r.reference}</span>
              <button className="btn secondaire petit" style={{ marginLeft: 10 }} onClick={() => copier('ref', r.reference)}>{copie === 'ref' ? tr('Copié') : tr('Copier')}</button></p>
            {r.comptes.map((c, i) => (
              <div key={i} className="carte pile">
                <div className="ligne espace">
                  <b>{tr('Virement en {0}', [c.devise === 'FCFA' ? 'FCFA' : symbole(c.devise)])}</b>
                  <span className="badge safran">{montant(c.parMois, c.devise)} {tr('par mois')}</span>
                </div>
                <p className="petit muet">{tr('À l’année : {0} ({1} mois offerts).', [montant(c.annuel, c.devise), 2])}</p>
                <Ligne libelle={tr('Bénéficiaire')} valeur={c.beneficiaire} />
                {c.banque && <Ligne libelle={tr('Banque')} valeur={c.banque} />}
                <Ligne libelle={c.iban.length > 24 ? 'IBAN' : tr('IBAN / RIB')} valeur={groupes(c.iban)} copie={copie === 'iban' + i} surCopier={() => copier('iban' + i, c.iban)} />
                {c.bic && <Ligne libelle="BIC / SWIFT" valeur={c.bic} copie={copie === 'bic' + i} surCopier={() => copier('bic' + i, c.bic)} />}
                {c.note && <p className="petit muet">{c.note}</p>}
                <button className="btn bloc" onClick={() => prevenir(c)} disabled={envoye}><Icone nom="ok" /> {envoye ? tr('L’équipe est prévenue') : tr('J’ai fait le virement')}</button>
              </div>
            ))}
            <p className="tres-petit muet">{tr('Votre abonnement est prolongé dès que l’équipe a reçu le virement (1 à 3 jours ouvrés selon les banques). Vous pouvez payer plusieurs mois d’un coup.')}</p>
          </>
        )}
      </div>
    </Feuille>
  );
}
