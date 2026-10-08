// ------------------------------------------------------------
// SUPPRIMER MON COMPTE : marche à suivre pour demander la suppression d'un compte et de ses données.
// Adresse demandée par Google Play pour les applications qui créent des comptes.
// ------------------------------------------------------------
import Link from 'next/link';
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE } from '@/config';
import { metaPage } from '@/lib/seo';

export const metadata = metaPage({
  title: 'Supprimer mon compte et mes données',
  description: 'Comment demander la suppression de votre compte Kaislo et de vos données : les étapes, le délai, ce qui est effacé et ce qui est conservé par la loi.',
  alternates: { canonical: '/supprimer-mon-compte/' },
});

const mail = <a href={`mailto:${SOCIETE.emailDonnees}?subject=Suppression%20de%20mon%20compte%20Kaislo`}>{SOCIETE.emailDonnees}</a>;

const SECTIONS = [
  {
    id: 'demander',
    titre: 'Demander la suppression',
    contenu: (
      <>
        <p>Vous pouvez demander à tout moment la suppression de votre compte Kaislo et des données du commerce. C’est gratuit.</p>
        <ol>
          <li><b>Facultatif : récupérez vos données.</b> Le gérant exporte les ventes, les produits et les clients dans l’application : Réglages → Profil → Vos données. Une fois le compte supprimé, il n’est plus possible de les retrouver.</li>
          <li><b>Écrivez-nous</b> à {mail}, avec pour objet « Suppression de mon compte Kaislo ». Indiquez le <b>numéro de téléphone avec lequel vous vous connectez</b> et le nom du commerce. Si vous avez plusieurs commerces, précisez lesquels supprimer (un seul, ou tous).</li>
          <li><b>Nous vérifions que c’est bien vous</b> : nous pouvons vous rappeler ou vous écrire sur WhatsApp à ce numéro. <b>Nous ne vous demandons jamais votre code PIN</b>, ni par e-mail, ni par message.</li>
          <li><b>Nous supprimons</b> le compte et vous le confirmons par écrit, au plus tard sous <b>un mois</b>.</li>
        </ol>
        <p className="petit muet">Vous pouvez aussi nous écrire par WhatsApp depuis la bulle « Discuter avec nous » du site ou de l’application.</p>
      </>
    ),
  },
  {
    id: 'efface',
    titre: 'Ce qui est supprimé',
    contenu: (
      <ul>
        <li>Le commerce et son abonnement.</li>
        <li>Le compte du gérant et ceux de ses vendeurs (nom, numéro de téléphone, code PIN chiffré, droits).</li>
        <li>Les produits, les catégories, le stock, les ventes, les dépenses, les clients et le crédit.</li>
        <li>Les appareils connectés et les connexions par empreinte digitale ou visage.</li>
        <li>Les messages échangés avec l’équipe Kaislo dans l’application.</li>
      </ul>
    ),
  },
  {
    id: 'conserve',
    titre: 'Ce que la loi nous oblige à garder',
    contenu: (
      <>
        <p>Certaines informations ne peuvent pas être effacées tout de suite, uniquement pour respecter la loi, et ne servent à rien d’autre :</p>
        <ul>
          <li><b>Les paiements d’abonnement</b> (date, montant, moyen de paiement) : durée imposée par la loi comptable de notre pays, en général 10 ans.</li>
          <li><b>Les journaux techniques de sécurité</b> : 12 mois au maximum.</li>
        </ul>
        <p>Les détails sont dans la <Link href="/confidentialite/">politique de confidentialité</Link>.</p>
      </>
    ),
  },
  {
    id: 'vendeur',
    titre: 'Vous êtes vendeur, client d’un commerce ou visiteur du site',
    contenu: (
      <ul>
        <li><b>Vendeur</b> : le compte est créé par le gérant du commerce, qui peut le désactiver tout de suite (Réglages → Équipe). Pour l’effacer définitivement, écrivez-nous (ou demandez au gérant de le faire).</li>
        <li><b>Client d’un commerce</b> : vos données sont d’abord celles du commerce, qui est responsable de leur usage. Adressez-vous à lui ; nous l’aidons à répondre.</li>
        <li><b>Visiteur du site</b> (message laissé avec la bulle « Discuter avec nous ») : écrivez-nous, nous supprimons votre message.</li>
        <li><b>Démonstration en ligne</b> : les données restent dans votre navigateur. Effacez les données du site dans les réglages de votre navigateur.</li>
      </ul>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Supprimer mon compte"
      intro="Comment demander la suppression de votre compte Kaislo et de vos données, et ce qui se passe ensuite."
      sections={SECTIONS}
    />
  );
}
