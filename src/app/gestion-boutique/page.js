// Page « boutique » pour Google : contenu dans src/components/site/activites.js
import PageMetier from '@/components/site/PageMetier';
import { ACTIVITES } from '@/components/site/activites';

export const metadata = ACTIVITES.boutique.metadata;

export default function Page() {
  return <PageMetier c={ACTIVITES.boutique.contenu} />;
}
