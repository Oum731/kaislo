// Version française : le contenu est dans src/components/site/pages/Stock.jsx
import Stock, { meta } from '@/components/site/pages/Stock';

export const metadata = meta('fr');

export default function Page() {
  return <Stock lang="fr" />;
}
