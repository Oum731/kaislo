// Version française : le contenu est dans src/components/site/pages/Vendeurs.jsx
import Vendeurs, { meta } from '@/components/site/pages/Vendeurs';

export const metadata = meta('fr');

export default function Page() {
  return <Vendeurs lang="fr" />;
}
