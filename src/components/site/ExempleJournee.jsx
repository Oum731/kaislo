'use client';
// ------------------------------------------------------------
// Exemple chiffré de la page d'accueil, avec choix de la devise
// (pour montrer que Kaislo fonctionne dans tous les pays)
// ------------------------------------------------------------
import { useState } from 'react';
import { convertirDepuisDirham } from '@/lib/donnees/demo';
import { formatPrix } from '@/lib/utils/format';
import { Puces } from '@/components/ui';

const DEVISES = [['FCFA', 'FCFA'], ['MAD', 'DH'], ['EUR', '€'], ['USD', '$']];

export default function ExempleJournee() {
  const [devise, setDevise] = useState('FCFA');
  const c = (x) => convertirDepuisDirham(x, devise);
  const p = (x) => formatPrix(x, devise);
  const ca = 20 * c(60) + 15 * c(45) + 30 * c(12);
  const depenses = c(600);
  return (
    <div className="tableau-exemple">
      <div>
        <Puces options={DEVISES} valeur={devise} surChanger={setDevise} />
        <p className="chapo" style={{ marginTop: 16 }}>
          Imaginons une journée avec 20 poulets braisés à {p(c(60))}, 15 riz sauce graine à {p(c(45))} et 30 boissons à {p(c(12))}.
          À chaque vente, Kaislo met à jour le tableau de bord. Le soir, le gérant voit immédiatement ce qu’il a gagné.
        </p>
        <p className="tres-petit muet" style={{ marginTop: 14 }}>
          Le solde correspond aux ventes moins les dépenses saisies, avant les autres charges éventuelles (loyer, salaires…).
        </p>
      </div>
      <div className="tableau-bord">
        <div className="grand-chiffre"><span className="petit" style={{ opacity: 0.8 }}>Chiffre d’affaires du jour</span><b>{p(ca)}</b></div>
        <div className="lignes" style={{ marginTop: 10 }}>
          <div><span>Produits vendus</span><b>65</b></div>
          <div><span>Tickets</span><b>25</b></div>
          <div><span>Dépenses du jour (marché, gaz…)</span><b>−{p(depenses)}</b></div>
          <div><span>Solde après dépenses</span><span>{p(ca - depenses)}</span></div>
        </div>
      </div>
    </div>
  );
}
