// ------------------------------------------------------------
// ACCUEIL DU SITE (côté client) : les produits et les boutiques autour du client, par proximité.
// Pas de page ni de lien propre à chaque boutique. Deux boutons seulement, pour les vendeurs et les livreurs.
// La présentation de Kaislo pour les commerçants est sur /vendeurs/ ; les tutoriels et guides n'existent que de ce côté.
// ------------------------------------------------------------
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates } from '@/lib/site-routes';
import Decouverte from '@/components/site/Decouverte';
import { EnTeteDecouverte, PiedSite } from '@/components/site/Site';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: lang === 'en' ? { absolute: tr('Kaislo — Boutiques et produits près de chez vous') } : tr('Kaislo — Boutiques et produits près de chez vous'),
    description: tr('Trouvez les produits et les boutiques de votre quartier, de la plus proche à la plus lointaine, et commandez directement.'),
    alternates: alternates('/', lang),
    langue: lang,
  });
}

export default function Accueil({ lang }) {
  choisirLangue(lang);
  return (
    <div className="site">
      <EnTeteDecouverte lang={lang} />
      <main>
        <section className="section decouverte-section">
          <div className="site-largeur">
            <h1 className="sr-only">{tr('Les boutiques et produits près de chez vous.')}</h1>
            <Decouverte />
            <p className="tres-petit muet annuaire-avertissement">{tr('Les boutiques sont tenues par des commerçants indépendants. Kaislo est un outil qui relie les boutiques et leurs clients : il n’est pas le vendeur et n’encaisse aucun paiement. Confirmez le prix et la disponibilité avec la boutique.')}</p>
          </div>
        </section>
      </main>
      <PiedSite cote="client" />
    </div>
  );
}
