'use client';
// ------------------------------------------------------------
// Exemple chiffré de la page d'accueil, dans la devise du pays du visiteur
// ------------------------------------------------------------
import { useSelectionPays } from '@/lib/pays-visiteur';
import { convertirDepuisDirham } from '@/lib/donnees/demo';
import { formatPrix } from '@/lib/utils/format';
import { tr } from '@/lib/i18n';

export default function ExempleJournee() {
  const [pays] = useSelectionPays();
  const devise = pays.devise;
  const c = (x) => convertirDepuisDirham(x, devise);
  const p = (x) => formatPrix(x, devise);
  const ca = 20 * c(60) + 15 * c(45) + 30 * c(12);
  const depenses = c(600);
  return (
    <div className="tableau-exemple">
      <div>
        <p className="chapo">{tr('Imaginons une journée avec 20 poulets braisés à {0}, 15 riz sauce graine à {1} et 30 boissons à {2}. À chaque vente, Kaislo met à jour le tableau de bord. Le soir, le gérant voit immédiatement ce qu’il a gagné.', [p(c(60)), p(c(45)), p(c(12))])}</p>
        <p className="tres-petit muet" style={{ marginTop: 14 }}>{tr('Le solde correspond aux ventes moins les dépenses saisies, avant les autres charges éventuelles (loyer, salaires…).')}</p>
      </div>
      <div className="tableau-bord">
        <div className="grand-chiffre"><span className="petit" style={{ opacity: 0.8 }}>{tr('Chiffre d’affaires du jour')}</span><b>{p(ca)}</b></div>
        <div className="lignes" style={{ marginTop: 10 }}>
          <div><span>{tr('Produits vendus')}</span><b>65</b></div>
          <div><span>{tr('Tickets')}</span><b>25</b></div>
          <div><span>{tr('Dépenses du jour (marché, gaz…)')}</span><b>−{p(depenses)}</b></div>
          <div><span>{tr('Solde après dépenses')}</span><span>{p(ca - depenses)}</span></div>
        </div>
      </div>
    </div>
  );
}
