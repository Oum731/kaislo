// ------------------------------------------------------------
// Page /livraison/?c=… : la course d'un livreur (lot L2). Non référencée ; la clé de la course est dans l'adresse envoyée au livreur par WhatsApp.
// ------------------------------------------------------------
import Course from '@/components/site/Course';

export const metadata = {
  title: 'Course de livraison',
  robots: { index: false, follow: false },
  alternates: { canonical: '/livraison/' },
};

export default function PageCourse() {
  return <Course />;
}
