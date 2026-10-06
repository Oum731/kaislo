import '@/lib/i18n/charge-en';
// English version : le contenu est dans src/components/site/pages/Accueil.jsx
import Accueil, { meta } from '@/components/site/pages/Accueil';

export const metadata = meta('en');

export default function Page() {
  return <Accueil lang="en" />;
}
