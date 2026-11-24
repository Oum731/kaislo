import '@/lib/i18n/charge-en';
// English version : le contenu est dans src/components/site/pages/Vendeurs.jsx
import Vendeurs, { meta } from '@/components/site/pages/Vendeurs';

export const metadata = meta('en');

export default function Page() {
  return <Vendeurs lang="en" />;
}
