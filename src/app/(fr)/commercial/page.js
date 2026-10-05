// ------------------------------------------------------------
// Page /commercial : espace des commerciaux Kaislo (non référencé par Google)
// ------------------------------------------------------------
import EspaceCommercial from '@/components/admin/EspaceCommercial';
import { chemin } from '@/config';

export const metadata = {
  title: 'Espace commercial',
  robots: { index: false, follow: false },
  alternates: { canonical: '/commercial/' },
  // Application installée depuis cette page : elle s'ouvre ici (et non dans l'application des commerces)
  manifest: chemin('/manifest-commercial.webmanifest'),
};

export default function PageCommercial() {
  return <EspaceCommercial />;
}
