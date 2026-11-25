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
            <div className="decouverte-texte" style={{ maxWidth: 720, margin: '28px auto 0' }}>
              <h2>{tr('Comment trouver les boutiques et produits près de chez vous')}</h2>
              <p>{tr('Kaislo classe les boutiques de votre quartier de la plus proche à la plus lointaine. Autorisez votre position, ou choisissez votre ville, et vous voyez tout de suite ce qui se vend autour de vous : épiceries, boulangeries, restaurants, boutiques de vêtements, de téléphones, de cosmétiques et bien d’autres.')}</p>
              <p>{tr('Chaque boutique est tenue par un commerçant indépendant. Vous consultez ses produits et ses prix, puis vous commandez directement auprès d’elle, en retrait en boutique ou en livraison quand elle la propose. Le commerçant confirme sa disponibilité et vous suivez l’état de votre commande.')}</p>
              <p>{tr('Vous êtes commerçant ? Kaislo est aussi une caisse et une gestion de stock qui marchent sans internet, sur un simple téléphone. Découvrez la présentation pour les vendeurs, ou devenez livreur pour gagner de l’argent près de chez vous.')}</p>
            </div>
            <p className="tres-petit muet annuaire-avertissement">{tr('Les boutiques sont tenues par des commerçants indépendants. Kaislo est un outil qui relie les boutiques et leurs clients : il n’est pas le vendeur et n’encaisse aucun paiement. Confirmez le prix et la disponibilité avec la boutique.')}</p>
          </div>
        </section>
      </main>
      <PiedSite cote="client" />
    </div>
  );
}
