// Version française : le contenu est dans src/components/site/pages/Accueil.jsx
import Accueil, { meta } from '@/components/site/pages/Accueil';

export const metadata = meta('fr');

export default function Page() {
  return <Accueil lang="fr" />;
}
