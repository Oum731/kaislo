// ------------------------------------------------------------
// CONDITIONS DE VENTE DES BOUTIQUES EN LIGNE (modèle commun)
// Chaque commande passée sur une boutique Kaislo se fait entre le client et le commerçant : ces conditions s'appliquent sauf conditions plus
// favorables au client propres à la boutique. Le client les accepte (case à cocher) avant de confirmer sa commande.
// Modèle à faire relire par un juriste (loi sur la vente à distance du pays de la boutique : au Maroc, loi n° 31-08 sur la protection du
// consommateur ; en Afrique de l'Ouest et du Centre, droit de la consommation et du commerce électronique du pays).
// ------------------------------------------------------------
import Link from 'next/link';
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE } from '@/config';
import { metaPage } from '@/lib/seo';

export const metadata = metaPage({
  title: 'Conditions de vente des boutiques en ligne',
  description: 'Les conditions de vente qui s’appliquent à une commande passée dans une boutique Kaislo : vendeur, prix, livraison, paiement, retours, réclamations et données personnelles.',
  alternates: { canonical: '/conditions-vente-boutiques/' },
});

const SECTIONS = [
  {
    id: 'vendeur',
    titre: 'Qui vend ?',
    contenu: (
      <>
        <p>Chaque boutique est tenue par un <b>commerçant indépendant</b>, identifié sur sa page (nom du commerce, ville, numéro WhatsApp). La vente se conclut <b>uniquement entre vous et ce commerçant</b>.</p>
        <p>Kaislo, édité par {SOCIETE.nom}, est un outil qui relie les boutiques et leurs clients : Kaislo n’est pas le vendeur, ne détient pas les articles, n’encaisse aucun paiement et n’est pas partie à la vente. Voir aussi les <Link href="/conditions-utilisation/#boutiques-en-ligne">règles des boutiques en ligne</Link>.</p>
      </>
    ),
  },
  {
    id: 'commande',
    titre: 'Passer une commande',
    contenu: (
      <>
        <p>Vous choisissez vos articles, indiquez votre nom, votre numéro et votre adresse de livraison, puis vous cochez la case d’acceptation de ces conditions et vous confirmez. La commande s’ouvre ensuite dans WhatsApp, prête à être envoyée à la boutique.</p>
        <p><b>La commande n’est prise en compte qu’une fois envoyée à la boutique, et acceptée par elle.</b> Le commerçant peut la confirmer, la modifier avec votre accord (quantités, articles) ou la refuser (par exemple article épuisé). Vous êtes prévenu par WhatsApp.</p>
      </>
    ),
  },
  {
    id: 'prix',
    titre: 'Prix et disponibilité',
    contenu: (
      <p>Les prix sont affichés dans la monnaie du pays de la boutique et fixés par le commerçant. Ils peuvent changer ; le prix applicable est celui confirmé par la boutique lors de la prise en compte de votre commande. Les frais de livraison éventuels sont indiqués par la boutique avant la livraison. Les articles sont proposés dans la limite des stocks disponibles.</p>
    ),
  },
  {
    id: 'paiement',
    titre: 'Paiement',
    contenu: (
      <p>Vous payez <b>directement le commerçant</b>, par les moyens qu’il accepte (espèces à la livraison, mobile money, virement…). Kaislo n’intervient pas dans le paiement : ne payez qu’au commerçant dont vous avez vérifié l’identité et le numéro.</p>
    ),
  },
  {
    id: 'livraison',
    titre: 'Livraison ou retrait',
    contenu: (
      <p>Le mode, la zone et le délai de livraison (ou de retrait) sont fixés par la boutique et affichés sur sa page ou confirmés par WhatsApp. Vérifiez votre commande à la réception : en cas d’article manquant, abîmé ou différent, prévenez la boutique tout de suite.</p>
    ),
  },
  {
    id: 'retours',
    titre: 'Retours, remboursement et rétractation',
    contenu: (
      <>
        <p>Le droit de retour, d’échange, de remboursement ou de rétractation d’une vente à distance dépend <b>de la loi du pays de la boutique</b> et de la nature de l’article (certains articles, comme les produits frais, périssables ou personnalisés, sont exclus). Lorsque la loi vous accorde un délai de rétractation, la boutique doit le respecter ; le commerçant peut aussi vous accorder des conditions plus favorables.</p>
        <p>Pour exercer un droit de retour, écrivez à la boutique par WhatsApp dans les meilleurs délais, en gardant l’article dans son état d’origine.</p>
      </>
    ),
  },
  {
    id: 'reclamations',
    titre: 'Réclamations',
    contenu: (
      <p>Adressez-vous d’abord à la boutique (numéro WhatsApp affiché sur sa page). À défaut de réponse ou de solution, vous pouvez signaler le problème à {SOCIETE.nom} : écrivez à <a href={`mailto:${SOCIETE.emailDonnees}`}>{SOCIETE.emailDonnees}</a> ; nous transmettons votre message à la boutique et pouvons suspendre une boutique qui ne respecte pas ces règles. Vous gardez, en toute hypothèse, vos droits de consommateur devant les autorités et les tribunaux de votre pays.</p>
    ),
  },
  {
    id: 'donnees',
    titre: 'Vos données personnelles',
    contenu: (
      <p>Votre nom, votre numéro et votre adresse sont transmis à la boutique pour traiter votre commande : elle en est responsable pour cet usage. Kaislo les héberge pour le compte de la boutique, sans les utiliser pour ses propres besoins. Pour exercer vos droits (accès, rectification, suppression, opposition), écrivez à la boutique ou à <a href={`mailto:${SOCIETE.emailDonnees}`}>{SOCIETE.emailDonnees}</a>. Voir la <Link href="/confidentialite/">politique de confidentialité</Link>, qui indique aussi la loi et l’autorité de votre pays.</p>
    ),
  },
  {
    id: 'droit',
    titre: 'Loi applicable',
    contenu: (
      <p>La vente est régie par la loi du pays de la boutique, sans priver le consommateur de la protection que lui accorde la loi de son pays de résidence.</p>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Conditions de vente des boutiques en ligne"
      intro="Ce qui s’applique quand vous commandez dans une boutique Kaislo."
      sections={SECTIONS}
    />
  );
}
