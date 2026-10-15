// ------------------------------------------------------------
// PAGE « BOUTIQUES » : annuaire pour les clients (boutiques en ligne des commerçants Kaislo, par rayon, avec des articles en exemple).
// La commande part directement sur le WhatsApp de la boutique choisie ; le client paie le commerçant.
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, Faq } from '@/components/site/Site';
import Annuaire from '@/components/site/Annuaire';
import { metaPage, JsonLd, filAriane } from '@/lib/seo';

export const metadata = metaPage({
  title: 'Boutiques en ligne près de chez vous',
  description: 'Découvrez les boutiques, restaurants et commerces de votre ville : choisissez vos articles et envoyez la commande directement sur WhatsApp à la boutique.',
  alternates: { canonical: '/boutiques/' },
});

const QUESTIONS = [
  ['Comment commander ?', 'Ouvrez une boutique, ajoutez les articles à votre panier, indiquez votre nom, votre numéro et votre adresse de livraison, puis confirmez : WhatsApp s’ouvre avec votre commande déjà écrite, à envoyer à la boutique.'],
  ['Pourquoi ne vois-je que les boutiques de mon pays ?', 'Pour que vous trouviez des boutiques qui livrent près de chez vous et affichent leurs prix dans votre devise. Votre pays est déduit de votre adresse IP (sans la conserver) ou de votre fuseau horaire ; vous pouvez le changer avec la liste ou « Utiliser ma position ».'],
  ['Kaislo est-il responsable de ce que vendent les boutiques ?', 'Non. Kaislo est un outil, un pont entre les boutiques et leurs clients : chaque boutique est un commerçant indépendant, seul responsable de ses articles, de ses prix, de sa livraison et de sa vente. Kaislo n’est pas le vendeur et n’encaisse aucun paiement. Confirmez le prix et la disponibilité avec la boutique avant de payer.'],
  ['Qui reçoit ma commande ?', 'Uniquement la boutique que vous avez choisie : la commande part directement sur son numéro WhatsApp. Kaislo ne la lit pas et ne la revend à personne.'],
  ['Comment je paie ?', 'Vous payez la boutique directement, à la livraison ou comme convenu avec le vendeur. Kaislo n’encaisse jamais l’argent.'],
  ['Qui livre ?', 'La boutique. Chaque commerçant indique ses conditions de livraison sur sa page ; confirmez-les avec lui sur WhatsApp avant de payer.'],
  ['Je suis commerçant : comment apparaître ici ?', 'Créez votre commerce sur Kaislo, cochez « Vendre en ligne » sur vos articles et activez votre boutique en ligne : vous choisissez si elle figure dans cette liste.'],
];

export default function PageBoutiques() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">Boutiques</span>
            <h1>Boutiques en ligne près de chez vous</h1>
            <p className="chapo">Restaurants, épiceries, boutiques, téléphonie… Les boutiques de votre pays : choisissez-en une, composez votre panier et envoyez la commande directement sur son WhatsApp. Vous payez le commerçant, comme d’habitude.</p>
          </div>
        </section>
        <section className="section">
          <div className="site-largeur">
            <Annuaire />
            <p className="tres-petit muet annuaire-avertissement">Les boutiques sont tenues par des commerçants indépendants. Kaislo est un outil qui relie les boutiques et leurs clients : il n’est pas le vendeur et n’est pas responsable des articles, des prix, de la livraison ni des ventes. <Link href="/conditions-utilisation/#boutiques-en-ligne">En savoir plus</Link></p>
          </div>
        </section>
        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Comment ça marche</span>
            <h2>Trois étapes, sans compte à créer.</h2>
            <ol className="annuaire-etapes">
              <li><b>1. Choisissez une boutique</b><span>Par rayon, ville ou article.</span></li>
              <li><b>2. Confirmez votre commande</b><span>Nom, numéro et adresse de livraison.</span></li>
              <li><b>3. Envoyez-la sur WhatsApp</b><span>Le message est déjà écrit et part vers la boutique choisie.</span></li>
            </ol>
          </div>
        </section>
        <section className="section" id="questions">
          <div className="site-largeur">
            <span className="etiquette">Questions fréquentes</span>
            <h2>Acheter en ligne dans une boutique Kaislo</h2>
            <Faq questions={QUESTIONS} />
          </div>
        </section>
        <section className="section claire">
          <div className="site-largeur">
            <h2>Vous avez un commerce ?</h2>
            <p className="chapo">Gérez vos ventes et votre stock avec Kaislo, puis ouvrez votre boutique en ligne : vos clients commandent sur WhatsApp et vous continuez à tout suivre comme d’habitude.</p>
            <p><Link className="btn" href="/app/?inscription=1">Essai gratuit de 30 jours</Link> <Link className="btn secondaire" href="/">Découvrir Kaislo</Link></p>
          </div>
        </section>
      </main>
      <PiedSite />
      <JsonLd donnees={filAriane([['Accueil', '/'], ['Boutiques', '/boutiques/']])} />
    </div>
  );
}
