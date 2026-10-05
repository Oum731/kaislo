// English version : contenu dans src/components/site/activites.js
import Activite, { meta } from '@/components/site/pages/Activite';

export const metadata = meta('quincaillerie', 'en');

export default function Page() {
  return <Activite cle="quincaillerie" lang="en" />;
}
