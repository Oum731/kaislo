import '@/lib/i18n/charge-en';
// English version : le contenu est dans src/components/site/pages/Restaurant.jsx
import Restaurant, { meta } from '@/components/site/pages/Restaurant';

export const metadata = meta('en');

export default function Page() {
  return <Restaurant lang="en" />;
}
