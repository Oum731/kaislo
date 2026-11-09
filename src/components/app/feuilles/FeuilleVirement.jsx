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
                {(m.liens || []).length > 0 && (
                  <div className="pile" style={{ gap: 8 }}>
                    {m.liens.map((l) => (
                      <a key={l.mois} className={l.mois === 1 ? 'btn bloc' : 'btn secondaire bloc'} href={l.url} target="_blank" rel="noreferrer">
                        <Icone nom="billet" /> {l.mois === 1 ? tr('Payer {0} avec {1} (1 mois)', [montant(l.montant, m.devise), m.operateur]) : tr('Payer {0} avec {1} (12 mois)', [montant(l.montant, m.devise), m.operateur])}
                      </a>
                    ))}
                    <p className="tres-petit muet">{tr('Le lien s’ouvre dans l’application {0} avec le montant de votre formule. Vérifiez-le avant de confirmer.', [m.operateur])}</p>
                  </div>
                )}
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
