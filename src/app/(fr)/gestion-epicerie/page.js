// Version française : le contenu est dans src/components/site/pages/Epicerie.jsx
import Epicerie, { meta } from '@/components/site/pages/Epicerie';

export const metadata = meta('fr');

export default function Page() {
  return <Epicerie lang="fr" />;
}
