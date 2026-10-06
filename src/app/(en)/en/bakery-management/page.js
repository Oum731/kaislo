import '@/lib/i18n/charge-en';
// English version : contenu dans src/components/site/activites.js
import Activite, { meta } from '@/components/site/pages/Activite';

export const metadata = meta('boulangerie', 'en');

export default function Page() {
  return <Activite cle="boulangerie" lang="en" />;
}
