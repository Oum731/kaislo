'use client';
// ------------------------------------------------------------
// SUIVI D'UNE COMMANDE PAR LE CLIENT (lot L1) : statut mis à jour toutes les 20 secondes, contact avec la boutique.
// La clé de suivi vient de l'appareil du client ; aucune adresse de page ne la contient.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { formatPrix } from '@/lib/utils/format';
import { etapesCommande } from '@/lib/commandes-client';

export default function SuiviCommande({ cle, surFermer }) {
  const [c, setC] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;
    const charger = () => appelApi('GET', '/public/commande-suivi?cle=' + encodeURIComponent(cle))
      .then((r) => { if (actif) { setC(r.commande); setErreur(''); } })
      .catch((e) => { if (actif) setErreur(e.statut === 404 ? 'Cette commande est introuvable.' : e.horsLigne ? 'Pas de connexion internet : le statut se mettra à jour dès que le réseau revient.' : e.message); });
    charger();
    const t = setInterval(charger, 20000);
    return () => { actif = false; clearInterval(t); };
  }, [cle]);

  const fini = c && (c.statut === 'livree' || c.statut === 'annulee');
  return (
    <div className="decouverte-boutique" role="dialog" aria-modal="true" aria-label="Suivi de commande">
      <div className="decouverte-boutique-barre"><button type="button" className="btn secondaire petit" onClick={surFermer}>← Retour aux boutiques</button></div>
      <div className="vitrine-centre">
        {erreur && <p className="alerte">{erreur}</p>}
        {!c && !erreur && <p className="muet">Chargement…</p>}
        {c && (
          <>
            <h1>Commande n° {c.numero}</h1>
            <p className="muet">{c.boutique} · {c.mode === 'retrait' ? 'Retrait en boutique' : 'Livraison'}</p>
            {c.statut === 'annulee' && <p className="alerte">La boutique a annulé cette commande. Écrivez-lui pour en savoir plus.</p>}
            <ol className="suivi-etapes">
              {etapesCommande(c.statut, c.mode).map((e) => <li key={e.id} className={'suivi-' + e.etat}><span aria-hidden="true">{e.etat === 'ok' ? '✓' : e.etat === 'en-cours' ? '●' : '○'}</span> {e.libelle}</li>)}
            </ol>
            <div className="carte pile">
              {c.lignes.map((l, i) => <div key={i} className="ligne" style={{ justifyContent: 'space-between' }}><span>{l.quantite} × {l.nom}</span></div>)}
              {c.frais > 0 && <div className="ligne" style={{ justifyContent: 'space-between' }}><span className="muet">Livraison</span><span>{formatPrix(c.frais, c.devise)}</span></div>}
              <div className="ligne" style={{ justifyContent: 'space-between' }}><b>Total</b><b>{formatPrix(c.total, c.devise)}</b></div>
              <p className="petit muet">Vous payez {c.boutique} directement, à la {c.mode === 'retrait' ? 'remise' : 'livraison'} ou comme convenu avec le vendeur.</p>
            </div>
            {c.whatsapp && <a className="btn secondaire bloc" target="_blank" rel="noreferrer" href={'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent('Bonjour, à propos de ma commande n° ' + c.numero)}>Écrire à la boutique sur WhatsApp</a>}
            {!fini && <p className="tres-petit muet">Cette page se met à jour toute seule.</p>}
          </>
        )}
      </div>
    </div>
  );
}
