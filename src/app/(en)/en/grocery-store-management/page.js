import '@/lib/i18n/charge-en';
// English version : le contenu est dans src/components/site/pages/Epicerie.jsx
import Epicerie, { meta } from '@/components/site/pages/Epicerie';

export const metadata = meta('en');

export default function Page() {
  return <Epicerie lang="en" />;
}
