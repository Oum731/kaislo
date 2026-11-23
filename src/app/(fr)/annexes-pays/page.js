// ------------------------------------------------------------
// ANNEXES PAR PAYS aux conditions d'utilisation : droit marocain pour le contrat d'abonnement, règles locales du pays du commerce en annexe.
// Données : src/lib/donnees/annexes-pays.js (et protection-donnees.js pour les lois sur les données). À faire relire par un juriste.
// ------------------------------------------------------------
import Link from 'next/link';
import PageLegale from '@/components/site/PageLegale';
import { SOCIETE, CONTACT_EMAIL } from '@/config';
import { ANNEXES_PAYS } from '@/lib/donnees/annexes-pays';
import { PROTECTION_DONNEES } from '@/lib/donnees/protection-donnees';
import { metaPage } from '@/lib/seo';

export const metadata = metaPage({
  title: 'Annexes par pays aux conditions d’utilisation',
  description: 'Droit applicable au contrat d’abonnement Kaislo et règles propres à chaque pays : monnaie, taxes, protection des données, vente à distance des boutiques.',
  alternates: { canonical: '/annexes-pays/' },
});

const SECTIONS = [
  {
    id: 'principe',
    titre: 'Le principe',
    contenu: (
      <>
        <p>Le contrat d’abonnement entre {SOCIETE.nom} et le commerce est régi par le <b>droit marocain</b>, {SOCIETE.nom} étant une société marocaine. Les litiges qui n’ont pas trouvé de solution amiable sont soumis aux tribunaux de Casablanca (voir les <Link href="/conditions-utilisation/#litiges">conditions d’utilisation</Link>).</p>
        <p>Chaque annexe ci-dessous précise, pour le pays de votre commerce, ce qui s’y applique en plus : monnaie, taxes, protection des données personnelles, vente à distance de vos boutiques. <b>Les dispositions impératives du pays de votre commerce</b> (consommateurs, données personnelles, impôts) <b>s’appliquent toujours</b> et l’emportent sur ces conditions en cas de contradiction.</p>
        <p>Le contrat est rédigé en français. Une question : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </>
    ),
  },
  ...ANNEXES_PAYS.map((a) => {
    const donnees = PROTECTION_DONNEES.find((p) => p.pays === a.protection);
    return {
      id: a.id,
      titre: 'Annexe : ' + a.pays,
      contenu: (
        <table className="tableau-legal">
          <tbody>
            <tr><th>Monnaie</th><td>{a.monnaie}</td></tr>
            <tr><th>Facturation et taxes</th><td>{a.taxes}</td></tr>
            <tr><th>Paiement de l’abonnement</th><td>Par les moyens affichés dans l’application pour votre pays (mobile money selon les pays, virement bancaire). Chaque paiement donne lieu à une facture acquittée.</td></tr>
            <tr><th>Données personnelles</th><td>{donnees ? <>{donnees.loi}. Autorité : {donnees.autorite}.</> : 'La loi locale sur la protection des données de votre pays.'} Voir la <Link href="/confidentialite/#pays">politique de confidentialité</Link>.</td></tr>
            <tr><th>Vente à distance (vos boutiques)</th><td>{a.vente} Voir les <Link href="/conditions-vente-boutiques/">conditions de vente des boutiques</Link>.</td></tr>
            {a.ohada && <tr><th>Droit des affaires</th><td>Ce pays est membre de l’OHADA : les actes uniformes de l’OHADA s’appliquent aux matières commerciales qu’ils régissent, sans modifier le droit applicable au contrat d’abonnement.</td></tr>}
          </tbody>
        </table>
      ),
    };
  }),
  {
    id: 'autres',
    titre: 'Autres pays',
    contenu: (
      <p>Pour les commerces établis dans un autre pays, le droit marocain régit le contrat d’abonnement, et les dispositions impératives du pays du commerce (consommateurs, données personnelles, impôts) s’appliquent en plus. Les annexes de nouveaux pays sont ajoutées au fur et à mesure ; écrivez-nous si votre pays n’y figure pas.</p>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Annexes par pays"
      intro="Le droit applicable à votre abonnement, et ce qui change selon le pays de votre commerce."
      sections={SECTIONS}
    />
  );
}
