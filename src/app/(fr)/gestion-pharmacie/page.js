// Version française : contenu dans src/components/site/activites.js
import Activite, { meta } from '@/components/site/pages/Activite';

export const metadata = meta('pharmacie', 'fr');

export default function Page() {
  return <Activite cle="pharmacie" lang="fr" />;
}
