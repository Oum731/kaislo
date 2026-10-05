'use client';
// Page d'accueil publique : quelqu'un déjà connecté (application, espace Amorac, espace commercial) est envoyé dans son espace.
// Le script placé en haut de la page (lib/espace.js) le fait au premier chargement, sans flash ; ce composant le fait aussi
// quand on arrive ici EN NAVIGUANT (bouton « retour » du navigateur depuis l'application), cas où le script ne s'exécute pas.
// replace : l'accueil public ne reste pas dans l'historique. Ajouter ?site=1 à l'adresse pour voir la page publique.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ADRESSES_ESPACES, enModeApplication, espaceMemorise } from '@/lib/espace';

export default function RedirectionEspace() {
  const router = useRouter();
  useEffect(() => {
    const espace = espaceMemorise();
    // Application installée : directement dans son espace (le dernier utilisé, sinon l'application des commerces)
    if (enModeApplication()) return router.replace(ADRESSES_ESPACES[espace || 'app']);
    if (/[?&]site\b/.test(window.location.search)) return;
    if (espace) router.replace(ADRESSES_ESPACES[espace]);
  }, [router]);
  return null;
}
