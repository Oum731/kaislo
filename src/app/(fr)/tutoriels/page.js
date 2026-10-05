// Version française : le contenu est dans src/components/site/pages/Tutoriels.jsx
import Tutoriels, { meta } from '@/components/site/pages/Tutoriels';

export const metadata = meta('fr');

export default function Page() {
  return <Tutoriels lang="fr" />;
}
