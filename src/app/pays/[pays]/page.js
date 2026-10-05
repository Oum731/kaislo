// ------------------------------------------------------------
// PAGE PAR PAYS : « Logiciel de gestion des ventes et du stock au Sénégal »
// Contenu composé à partir des vraies données du pays (devise, modes de paiement, prix, numéros de téléphone).
// ------------------------------------------------------------
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EnTeteSite, PiedSite, Hero, ListeFonctions, Faq, AppelFinal, DonneesLogiciel, LIEN_DEMO_RESTO, LIEN_INSCRIPTION } from '@/components/site/Site';
import { PAYS_SEO, lienPays } from '@/lib/pays-seo';
import { PAYS } from '@/lib/donnees/modeles';
import { REGLES_TELEPHONE } from '@/lib/donnees/telephone';
import { FORMULES } from '@/lib/donnees/tarifs';
import { formatPrix } from '@/lib/utils/format';
import { metaPage, JsonLd, filAriane } from '@/lib/seo';

export const dynamicParams = false;
export const generateStaticParams = () => PAYS_SEO.map((p) => ({ pays: p.slug }));

function donnees(slug) {
  const seo = PAYS_SEO.find((p) => p.slug === slug);
  if (!seo) return null;
  const pays = PAYS.find((p) => p.id === seo.id);
  const lieu = `${seo.prep} ${pays.nom}`; // « au Sénégal », « en Côte d’Ivoire »
  const mobile = pays.paiements.filter((m) => !['Espèces', 'Carte'].includes(m));
  const modes = pays.paiements.join(', ').replace(/, ([^,]*)$/, ' et $1');
  const aPartirDe = Math.min(...FORMULES.map((f) => f.prix[pays.devise]));
  return { seo, pays, lieu, mobile, modes, aPartirDe };
}

export async function generateMetadata({ params }) {
  const d = donnees((await params).pays);
  if (!d) return {};
  return metaPage({
    title: `Logiciel de gestion de commerce ${d.lieu}`,
    description: `Gérez ventes, stock et crédit clients ${d.lieu}, en ${d.pays.devise}${d.mobile.length ? ' avec ' + d.mobile.join(', ') : ''}. Sur téléphone, avec ou sans internet. Essai gratuit 30 jours.`,
    alternates: { canonical: lienPays(d.seo) },
  });
}

export default async function PagePays({ params }) {
  const d = donnees((await params).pays);
  if (!d) notFound();
  const { seo, pays, lieu, mobile, modes, aPartirDe } = d;
  const prix = `${formatPrix(aPartirDe, pays.devise)} par mois`;
  const regle = REGLES_TELEPHONE[pays.id];
  const faq = [
    [`Kaislo fonctionne-t-il sans internet ${lieu} ?`, 'Oui. Vous continuez à vendre même quand la connexion coupe : les ventes sont gardées dans l’appareil et envoyées dès que le réseau revient.'],
    [`Quels modes de paiement puis-je enregistrer ${lieu} ?`, `${modes}. C’est une simple indication à chaque vente : le client vous paie directement, et le soir Kaislo vous donne le total de chaque mode pour vérifier vos comptes.`],
    ['Kaislo encaisse-t-il l’argent de mes clients ?', 'Non, jamais. Vos clients vous paient comme d’habitude. Kaislo note les ventes, suit le stock et prépare vos comptes du soir.'],
    [`Combien coûte Kaislo ${lieu} ?`, `Essai gratuit de 30 jours, puis un abonnement selon votre métier : à partir de ${prix}, avec 1 poste et 5 vendeurs inclus et 2 mois offerts à l’année.`],
    ['Faut-il acheter du matériel ?', 'Non. Kaislo fonctionne sur le téléphone, la tablette ou l’ordinateur que vous avez déjà. L’imprimante de tickets est facultative.'],
  ];
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <Hero
          titre={`Gérez vos ventes et votre stock ${lieu}, depuis votre téléphone.`}
          chapo={`Kaislo aide les commerces ${lieu} (${seo.commerces.join(', ')}) à noter leurs ventes, suivre leur stock, gérer le crédit de leurs clients et retrouver leurs comptes chaque soir à ${pays.ville || 'toute heure'}, en ${pays.devise}.`}
          lienDemo={LIEN_DEMO_RESTO}
          garanties={['Essai gratuit de 30 jours', `Prix en ${pays.devise}`, 'Marche sans internet']}
          capture={{ src: '/captures/vente-ordi.webp', alt: `Écran de vente Kaislo, prix en ${pays.devise}` }}
          captureMobile={{ src: '/captures/vente-mobile.webp', alt: 'Écran de vente Kaislo sur téléphone' }}
        />
        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">Adapté à votre pays</span>
            <h2>Les réalités de votre pays, déjà prévues.</h2>
            <ListeFonctions fonctions={[
              [`Prix en ${pays.devise}`, `Montants affichés et arrondis comme chez vous (${pays.devise}), tickets et comptes du soir dans votre devise.`],
              ['Vos modes de paiement', `${modes} : notez comment chaque client a payé, et le soir retrouvez le total de chacun.`],
              ['Numéros de téléphone du pays', regle ? `Vendeurs et clients enregistrés avec leur numéro au format international (+${pays.indicatif}), par exemple ${regle.exemple}.` : 'Numéros enregistrés au format international.'],
              ['Vos commerces', `Prêt à l’emploi pour : ${seo.commerces.join(', ')}. Catégories et unités de vente de votre métier déjà prêtes.`],
              ['Crédit des clients', 'Remplacez le cahier : achats à crédit, remboursements, total dû et rappel par WhatsApp.'],
              ['Stock et inventaire', 'Entrées de marchandise, alertes avant la rupture, inventaire et export Excel.'],
            ]} />
          </div>
        </section>
        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Tarifs {lieu}</span>
            <h2>À partir de {prix}.</h2>
            <p className="chapo">Un abonnement selon votre métier, 1 poste et 5 vendeurs inclus. Essai gratuit de 30 jours, sans engagement. <Link href="/tarifs/">Voir tous les tarifs</Link>.</p>
          </div>
        </section>
        <section className="section" id="questions">
          <div className="site-largeur">
            <span className="etiquette">Questions fréquentes</span>
            <h2>Kaislo {lieu} : vos questions.</h2>
            <Faq questions={faq} />
          </div>
        </section>
        <AppelFinal titre={`Essayez Kaislo ${lieu}.`} texte="Créez votre commerce en deux minutes, ou testez la démo avec un restaurant et une épicerie déjà remplis." lienDemo={LIEN_DEMO_RESTO} />
      </main>
      <PiedSite />
      <DonneesLogiciel description={`Logiciel de gestion des ventes et du stock pour les commerces ${lieu} : ventes, stock, crédit clients, comptes du soir en ${pays.devise}.`} />
      <JsonLd donnees={filAriane([['Accueil', '/'], [`Kaislo ${lieu}`, lienPays(seo)]])} />
    </div>
  );
}
