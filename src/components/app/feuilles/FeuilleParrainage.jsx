'use client';
// ------------------------------------------------------------
// « Parrainer un commerçant » : le gérant partage son code de parrainage (« P » + code du commerce) sur WhatsApp.
// Le commerçant parrainé reçoit des jours d'essai en plus ; le parrain gagne des jours offerts quand le filleul fait son premier paiement.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone } from '@/components/ui';
import { appelApi } from '@/lib/api';
import { tr } from '@/lib/i18n';
import { JOURS_BONUS_FILLEUL, JOURS_BONUS_PARRAIN } from '@/lib/donnees/parrainage';

const DEMO = { code: 'P123456', lien: 'https://kaislo.com/app/?ref=P123456', joursFilleul: JOURS_BONUS_FILLEUL, joursParrain: JOURS_BONUS_PARRAIN, filleuls: [], recompenses: 0, joursGagnes: 0, maximum: 12 };

export function messageParrainage(p) {
  return tr('Bonjour ! Je gère mon commerce avec Kaislo (caisse, stock, reçus WhatsApp) et ça m’aide beaucoup. Essayez-le gratuitement pendant {0} jours avec mon code {1} : {2}', [30 + p.joursFilleul, p.code, p.lien]);
}

export function FeuilleParrainage() {
  const s = useKaislo();
  const demo = s.estDemoActuel();
  const [p, setP] = useState(demo ? DEMO : null);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    if (demo) return;
    appelApi('GET', '/parrainage', null, s.jetonServeur())
      .then(setP)
      .catch((e) => setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copier = async () => {
    try { await navigator.clipboard.writeText(messageParrainage(p)); setCopie(true); setTimeout(() => setCopie(false), 2500); } catch { setErreur(tr('Copie impossible : utilisez le bouton WhatsApp.')); }
  };

  return (
    <Feuille titre={tr('Parrainer un commerçant')} surFermer={s.fermer}
      pied={p && <a className="btn grand bloc" href={'https://wa.me/?text=' + encodeURIComponent(messageParrainage(p))} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> {tr('Envoyer mon code sur WhatsApp')}</a>}>
      <div className="pile">
        {demo && <p className="info-verte petit">{tr('Démo : voici un exemple. Avec un vrai compte, vous avez votre propre code.')}</p>}
        {erreur && <p className="alerte">{erreur}</p>}
        {!p && !erreur && <p className="muet petit">{tr('Chargement…')}</p>}
        {p && (
          <>
            <div className="code-parrainage">
              <span className="petit-titre">{tr('Votre code de parrainage')}</span>
              <b>{p.code}</b>
              <button type="button" className="btn secondaire petit" onClick={copier}><Icone nom="ok" taille="sm" /> {copie ? tr('Message copié') : tr('Copier le message')}</button>
            </div>
            <div className="carte pile petit">
              <p><b>{tr('Comment ça marche')}</b></p>
              <p>{tr('1. Envoyez votre code à un commerçant qui ne connaît pas encore Kaislo.')}</p>
              <p>{tr('2. Il s’inscrit avec votre code : il a {0} jours d’essai gratuit en plus ({1} au total).', [p.joursFilleul, 30 + p.joursFilleul])}</p>
              <p>{tr('3. Quand il fait son premier paiement, vous gagnez {0} jours offerts sur votre abonnement.', [p.joursParrain])}</p>
              <p className="tres-petit muet">{tr('Le commerce doit appartenir à une autre personne que vous. Maximum {0} récompenses par commerce.', [p.maximum])}</p>
            </div>
            <div className="carte pile">
              <div className="ligne espace"><b>{tr('Vos filleuls')}</b><span className="badge">{tr('{0} jours gagnés', [p.joursGagnes])}</span></div>
              {!p.filleuls.length && <p className="petit muet">{tr('Personne pour le moment. Partagez votre code !')}</p>}
              {p.filleuls.map((f, i) => (
                <div key={i} className="ligne espace" style={{ gap: 10 }}>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{f.nom}</span>
                  <span className={`badge ${f.gagne ? '' : 'safran'}`}>{f.gagne ? tr('Jours offerts ✓') : tr('En essai')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Feuille>
  );
}
