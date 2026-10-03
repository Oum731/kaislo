// ------------------------------------------------------------
// Page /commercial : espace des commerciaux Kaislo (non référencé par Google)
// ------------------------------------------------------------
import EspaceCommercial from '@/components/admin/EspaceCommercial';

export const metadata = {
  title: 'Espace commercial',
  robots: { index: false, follow: false },
  alternates: { canonical: '/commercial/' },
};

export default function PageCommercial() {
  return <EspaceCommercial />;
}
