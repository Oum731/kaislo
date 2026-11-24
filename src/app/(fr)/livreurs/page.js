// Page « Livreurs » : le contenu est dans src/components/site/pages/Livreurs.jsx
import Livreurs, { meta } from '@/components/site/pages/Livreurs';

export const metadata = meta('fr');

export default function Page() {
  return <Livreurs lang="fr" />;
}
