// Version française : contenu dans src/components/site/activites.js
import Activite, { meta } from '@/components/site/pages/Activite';

export const metadata = meta('boulangerie', 'fr');

export default function Page() {
  return <Activite cle="boulangerie" lang="fr" />;
}
