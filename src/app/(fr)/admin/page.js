// ------------------------------------------------------------
// Page /admin : espace de l'équipe Kaislo (non référencé par Google)
// ------------------------------------------------------------
import Admin from '@/components/admin/Admin';
import { chemin } from '@/config';

export const metadata = {
  title: 'Espace Kaislo',
  robots: { index: false, follow: false },
  // Application installée depuis cette page : elle s'ouvre ici (et non dans l'application des commerces)
  manifest: chemin('/manifest-admin.webmanifest'),
};

export default function PageAdmin() {
  return <Admin />;
}
