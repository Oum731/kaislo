// Version française : le contenu est dans src/components/site/pages/Restaurant.jsx
import Restaurant, { meta } from '@/components/site/pages/Restaurant';

export const metadata = meta('fr');

export default function Page() {
  return <Restaurant lang="fr" />;
}
