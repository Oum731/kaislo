// ------------------------------------------------------------
// TICKET DE CAISSE de l'accueil : un exemple de vente telle que Kaislo la note (articles, total, paiement, stock).
// Les montants sont ceux de la boutique de démonstration ; le total est calculé ici pour rester juste.
// ------------------------------------------------------------
import { tr } from '@/lib/i18n';
import { formatPrix } from '@/lib/utils/format';

const LIGNES = () => [
  [tr('Huile de table 1 L'), 1, 1450],
  [tr('Sucre en morceaux 1 kg'), 2, 750],
  [tr('Riz parfumé 5 kg'), 1, 3250],
];

export default function TicketCaisse() {
  const lignes = LIGNES();
  const total = lignes.reduce((s, [, q, p]) => s + q * p, 0);
  return (
    <figure className="tk" aria-label={tr('Exemple de ticket de caisse Kaislo')}>
      <div className="tk-papier">
        <p className="tk-nom">{tr('Épicerie Awa')}</p>
        <p className="tk-sous">{tr('Abidjan · Ticket n° 0127')}</p>
        <ul className="tk-lignes">
          {lignes.map(([nom, q, p]) => (
            <li key={nom}>
              <span>{q > 1 ? `${q} × ` : ''}{nom}</span>
              <span className="tk-montant">{formatPrix(q * p, 'FCFA')}</span>
            </li>
          ))}
        </ul>
        <p className="tk-total"><span>{tr('Total')}</span><span className="tk-montant">{formatPrix(total, 'FCFA')}</span></p>
        <p className="tk-ligne"><span>{tr('Payé avec Wave')}</span><span className="tk-montant">{formatPrix(total, 'FCFA')}</span></p>
        <p className="tk-stock">{tr('Stock mis à jour : huile 1 L, il en reste 11.')}</p>
      </div>
      <figcaption className="tk-legende">{tr('Un ticket Kaislo, envoyé par WhatsApp au client.')}</figcaption>
    </figure>
  );
}
