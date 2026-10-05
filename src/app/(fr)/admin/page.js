// ------------------------------------------------------------
// Page /admin : espace de l'équipe Amorac (non référencé par Google)
// ------------------------------------------------------------
import Admin from '@/components/admin/Admin';

export const metadata = {
  title: 'Espace Amorac',
  robots: { index: false, follow: false },
};

export default function PageAdmin() {
  return <Admin />;
}
