// Mise en page anglaise (une page « racine » par langue : attribut lang correct dès le HTML)
import '@/lib/i18n/charge-en';
import ChargerEn from '@/components/site/ChargerEn';
import { LayoutRacine, metadataRacine, viewport as vue } from '@/lib/layout-racine';

export const viewport = vue;
export const metadata = metadataRacine('en');

export default function Layout({ children }) {
  return <LayoutRacine lang="en"><ChargerEn />{children}</LayoutRacine>;
}
