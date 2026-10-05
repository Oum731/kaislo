// ------------------------------------------------------------
// Page /app : l'application de caisse (pas référencée par Google)
// ------------------------------------------------------------
import Application from '@/components/app/Application';

export const metadata = {
  title: 'Application',
  description: 'Connectez-vous à votre espace Kaislo.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/app/' },
};

export default function PageApplication() {
  return <Application />;
}
