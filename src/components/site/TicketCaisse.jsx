'use client';
// ------------------------------------------------------------
// TICKET DE CAISSE de l'accueil : un exemple de vente telle que Kaislo la note (articles, total, paiement, stock).
// Il suit le pays du visiteur (adresse IP, sinon fuseau horaire : même détection que les tarifs) : devise, prix d'un
// panier courant dans ce pays, ville et moyen de paiement du pays. Avant la détection, la page générée à l'avance
// montre le pays par défaut. Le total est calculé ici pour rester juste.
// ------------------------------------------------------------
import { tr } from '@/lib/i18n';
import { formatPrix, arrondir } from '@/lib/utils/format';
import { useSelectionPays } from '@/lib/pays-visiteur';

// Prix d'un panier courant : [huile 1 L, sucre 1 kg (×2), riz 5 kg] dans chaque devise (prix du pays, pas une conversion)
const PRIX = {
  FCFA: [1450, 750, 3250],
  GNF: [20000, 10000, 45000],
  MAD: [16, 8, 55],
  EUR: [2.5, 1.2, 6.9],
  CAD: [4.99, 2.49, 12.99],
  USD: [3.49, 1.79, 8.99],
};

// Moyen de paiement du pays : le premier moyen local (Wave, Payconiq, Interac…), sinon la carte
const moyenLocal = (paiements = []) => paiements.find((m) => !['Espèces', 'Carte', 'Ticket resto'].includes(m));

const nomEpicerie = (devise) => ({
  MAD: tr('Épicerie Hassan'), EUR: tr('Épicerie Léa'), CAD: tr('Épicerie Marie'),
}[devise] || tr('Épicerie Awa'));

export default function TicketCaisse() {
  const [pays] = useSelectionPays();
  const devise = PRIX[pays.devise] ? pays.devise : 'USD';
  const [huile, sucre, riz] = PRIX[devise];
  const lignes = [[tr('Huile de table 1 L'), 1, huile], [tr('Sucre en morceaux 1 kg'), 2, sucre], [tr('Riz parfumé 5 kg'), 1, riz]];
  const total = arrondir(lignes.reduce((s, [, q, p]) => s + q * p, 0), devise);
  const local = moyenLocal(pays.paiements);
  return (
    <figure className="tk" aria-label={tr('Exemple de ticket de caisse Kaislo')}>
      <div className="tk-papier">
        <p className="tk-nom">{nomEpicerie(devise)}</p>
        <p className="tk-sous">{pays.ville || tr('Votre ville')} · {tr('Ticket n° 0127')}</p>
        <ul className="tk-lignes">
          {lignes.map(([nom, q, p]) => (
            <li key={nom}>
              <span>{q > 1 ? `${q} × ` : ''}{nom}</span>
              <span className="tk-montant">{formatPrix(arrondir(q * p, devise), devise)}</span>
            </li>
          ))}
        </ul>
        <p className="tk-total"><span>{tr('Total')}</span><span className="tk-montant">{formatPrix(total, devise)}</span></p>
        <p className="tk-ligne"><span>{local ? tr('Payé avec {0}', [local]) : tr('Payé par carte')}</span><span className="tk-montant">{formatPrix(total, devise)}</span></p>
        <p className="tk-stock">{tr('Stock mis à jour : huile 1 L, il en reste 11.')}</p>
      </div>
      <figcaption className="tk-legende">{tr('Un ticket Kaislo, envoyé par WhatsApp au client.')}</figcaption>
    </figure>
  );
}
