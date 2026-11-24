// ------------------------------------------------------------
// Page /espace-livreur/?k=… : l'espace personnel d'un livreur indépendant Kaislo (lot L5). Non référencée ; le lien est envoyé par l'équipe.
// ------------------------------------------------------------
import EspaceLivreur from '@/components/site/EspaceLivreur';

export const metadata = {
  title: 'Espace livreur',
  robots: { index: false, follow: false },
  alternates: { canonical: '/espace-livreur/' },
};

export default function PageEspaceLivreur() {
  return <EspaceLivreur />;
}
