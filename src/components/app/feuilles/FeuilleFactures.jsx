'use client';
// ------------------------------------------------------------
// MES FACTURES : les factures et avoirs émis par Kaislo pour ce commerce (PDF). Le gérant est prévenu à chaque nouvelle facture
// (e-mail, notification, bandeau sur l'accueil) ; voir api/lib/facturation.php.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone } from '@/components/ui';
import { formatDate, formatPrix } from '@/lib/utils/format';
import { appelApi } from '@/lib/api';
import { telechargerFacture } from '@/lib/export/telecharger-facture';
import { tr } from '@/lib/i18n';

const cleVue = (commerceId) => 'kaislo:facture-vue:' + commerceId;
/** Numéro de la dernière facture déjà vue sur cet appareil (null si aucune). */
export function factureVue(commerceId) {
  try { return localStorage.getItem(cleVue(commerceId)); } catch { return null; }
}
export function noterFactureVue(commerceId, numero) {
  try { localStorage.setItem(cleVue(commerceId), numero); } catch { /* navigateur sans stockage : le bandeau reviendra */ }
}

/** Liste des factures et avoirs avec un bouton PDF. */
export function ListeFactures() {
  const s = useKaislo();
  const [factures, setFactures] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    appelApi('GET', '/factures', null, s.jetonServeur()).then((r) => setFactures([...r.factures, ...(r.avoirs || [])].sort((a, b) => b.date.localeCompare(a.date)))).catch(() => setFactures([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!factures) return <p className="muet petit">{tr('Chargement…')}</p>;
  if (!factures.length) return <p className="muet petit">{tr('Aucune facture pour l’instant.')}</p>;
  const telecharger = async (f) => {
    setErreur(null);
    try { await telechargerFacture(f); } catch { setErreur(tr('Impossible de créer le PDF, réessayez')); }
  };
  return (
    <>
      {factures.map((f) => (
        <div key={f.id} className="ligne espace" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="petit"><b>{f.numero}</b>{f.type === 'avoir' ? ' (' + tr('avoir') + ')' : ''} · {formatDate(f.date)} · {formatPrix(f.totalTtc, f.devise)}</span>
          <button className="btn secondaire petit" onClick={() => telecharger(f)}><Icone nom="installer" taille="sm" /> {tr('PDF')}</button>
        </div>
      ))}
      {erreur && <p className="alerte">{erreur}</p>}
    </>
  );
}

export function FeuilleFactures() {
  const s = useKaislo();
  const dernier = s.derniereFacture;
  useEffect(() => { if (dernier) noterFactureVue(s.d.commerce.id, dernier.numero); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Feuille titre={tr('Mes factures')} sousTitre={tr('Émises par Kaislo pour {0}', [s.d.commerce.nom])} surFermer={s.fermer} pleine>
      <div className="pile"><ListeFactures /></div>
    </Feuille>
  );
}

/** Bandeau de l'accueil du gérant : « Votre facture est disponible » tant qu'elle n'a pas été ouverte ou masquée. */
export function BandeauFacture() {
  const s = useKaislo();
  const dernier = s.derniereFacture;
  const [masque, setMasque] = useState(false);
  if (!dernier || masque || !s.estGerant() || s.estDemoActuel() || factureVue(s.d.commerce.id) === dernier.numero) return null;
  const avoir = dernier.type === 'avoir';
  const fermer = () => { noterFactureVue(s.d.commerce.id, dernier.numero); setMasque(true); };
  return (
    <div className="astuce ligne" style={{ marginBottom: 16, maxWidth: 720, flexWrap: 'wrap', gap: 8 }}>
      <span className="grandit">
        <b>{avoir ? tr('Votre avoir est disponible') : tr('Votre facture est disponible')}</b>
        <span className="petit bloc-texte">{dernier.numero} · {formatPrix(Math.abs(dernier.totalTtc), dernier.devise)}</span>
      </span>
      <button className="btn petit" onClick={() => s.ouvrir('factures')}>{tr('Voir mes factures')}</button>
      <button className="btn secondaire petit" onClick={fermer} aria-label={tr('Masquer')}>{tr('Masquer')}</button>
    </div>
  );
}
