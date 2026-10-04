// Page « boulangerie » pour Google : contenu dans src/components/site/activites.js
import PageMetier from '@/components/site/PageMetier';
import { ACTIVITES } from '@/components/site/activites';

export const metadata = ACTIVITES.boulangerie.metadata;

export default function Page() {
  return <PageMetier c={ACTIVITES.boulangerie.contenu} />;
}
