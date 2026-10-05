// English version : contenu dans src/components/site/activites.js
import Activite, { meta } from '@/components/site/pages/Activite';

export const metadata = meta('bar', 'en');

export default function Page() {
  return <Activite cle="bar" lang="en" />;
}
