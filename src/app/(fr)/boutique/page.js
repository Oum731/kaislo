// ------------------------------------------------------------
// Page /boutique/?b=nom-du-commerce : vitrine d'un commerçant (le contenu vient de l'API ; non référencée par Google)
// ------------------------------------------------------------
import Boutique from '@/components/site/Boutique';

export const metadata = {
  title: 'Boutique',
  description: 'Commandez auprès de votre commerçant : choisissez vos articles et envoyez la commande sur WhatsApp.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/boutique/' },
};

export default function PageBoutique() {
  return <Boutique />;
}
