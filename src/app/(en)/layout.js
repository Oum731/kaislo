// Mise en page anglaise (une page « racine » par langue : attribut lang correct dès le HTML)
import { LayoutRacine, metadataRacine, viewport as vue } from '@/lib/layout-racine';

export const viewport = vue;
export const metadata = metadataRacine('en');

export default function Layout({ children }) {
  return <LayoutRacine lang="en">{children}</LayoutRacine>;
}
