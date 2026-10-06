import '@/lib/i18n/charge-en';
// English version : le contenu est dans src/components/site/pages/Tutoriels.jsx
import Tutoriels, { meta } from '@/components/site/pages/Tutoriels';

export const metadata = meta('en');

export default function Page() {
  return <Tutoriels lang="en" />;
}
