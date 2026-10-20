'use client';
// ------------------------------------------------------------
// « Payer par virement » : le gérant voit les comptes bancaires de l'équipe Amorac, le montant exact à virer dans la devise du compte
// et la référence à écrire dans le motif du virement. « J'ai fait le virement » prévient l'équipe par la messagerie (écran Aide).
// L'équipe enregistre ensuite le paiement dans l'espace Amorac (moyen « Virement »). Voir api/lib/virement.php.
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
      // Message pour l'équipe Amorac : toujours en français, quelle que soit la langue de l'application
      await appelApi('POST', '/messages', { texte: `J’ai fait un virement (compte en ${compte.devise}, ${montant(compte.parMois, compte.devise)} par mois). Référence : ${r.reference}.` }, s.jetonServeur());
      setEnvoye(true);
    } catch (e) { setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message); }
  };

  return (
    <Feuille titre={tr('Payer par virement')} surFermer={s.fermer} pleine large>
      <div className="pile">
        {erreur && <p className="alerte">{erreur}</p>}
        {!r && !erreur && <p className="muet petit">{tr('Chargement…')}</p>}
        {r && !r.comptes.length && <p className="astuce">{tr('Le virement bancaire n’est pas encore disponible ici. Écrivez-nous (écran Aide) : nous vous donnons les coordonnées bancaires.')}</p>}
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
