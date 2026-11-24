import '@/lib/i18n/charge-en';
// Page « Livreurs » : le contenu est dans src/components/site/pages/Livreurs.jsx
import Livreurs, { meta } from '@/components/site/pages/Livreurs';

export const metadata = meta('en');

export default function Page() {
  return <Livreurs lang="en" />;
}
