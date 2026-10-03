'use client';
// ------------------------------------------------------------
// Point de départ de l'application (/app)
// ------------------------------------------------------------
import { useEffect } from 'react';
import { useKaisly } from '@/store/kaisly';
import Connexion from './Connexion';
import Coque from './Coque';
import { chemin } from '@/config';
import Chargement from '@/components/Chargement';

export default function Application() {
  const pret = useKaisly((s) => s.pret);
  const connecte = useKaisly((s) => !!s.utilisateur && !!s.d);
  const toast = useKaisly((s) => s.toast);

  // Les données sont dans le téléphone : on les lit une fois la page affichée
  useEffect(() => {
    useKaisly.getState().demarrer();
    // Installation sur l'écran d'accueil + ouverture hors connexion (version en ligne seulement)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register(chemin('/sw.js')).catch(() => {});
    }
  }, []);

  // Écran de lancement : visible dès l'ouverture, avant même le chargement du JavaScript
  if (!pret) return <Chargement texte="Ouverture de votre caisse…" />;

  return (
    <div className="app">
      {connecte ? <Coque /> : <Connexion />}
      {toast && (
        <div key={toast.id} className={`toast ${toast.type === 'erreur' ? 'erreur' : ''}`} role="status">
          {toast.texte}
        </div>
      )}
    </div>
  );
}
