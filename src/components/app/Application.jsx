'use client';
// ------------------------------------------------------------
// Point de départ de l'application (/app)
// ------------------------------------------------------------
import { useEffect } from 'react';
import { useKaislo, ajouterEtape } from '@/store/kaislo';
import Connexion from './Connexion';
import Coque from './Coque';
import { chemin } from '@/config';
import Chargement from '@/components/Chargement';
import BulleChat from '@/components/BulleChat';

export default function Application() {
  const pret = useKaislo((s) => s.pret);
  const connecte = useKaislo((s) => !!s.utilisateur && !!s.d);
  const toast = useKaislo((s) => s.toast);

  // Les données sont dans le téléphone : on les lit une fois la page affichée
  useEffect(() => {
    useKaislo.getState().demarrer();
    // Installation sur l'écran d'accueil + ouverture hors connexion (version en ligne seulement)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register(chemin('/sw.js')).catch(() => {});
    }
    // Bouton « retour » du téléphone (voir retourTelephone dans store/kaislo.js)
    const surRetour = (e) => useKaislo.getState().retourTelephone(e.state);
    window.addEventListener('popstate', surRetour);
    // Écrans de connexion / inscription : une étape d'historique pour pouvoir revenir à l'accueil
    const desabonner = useKaislo.subscribe((etat, avant) => {
      if (!etat.utilisateur && etat.etapeConnexion !== avant.etapeConnexion && avant.etapeConnexion === 'accueil') {
        ajouterEtape({ kaislo: 'etape' });
      }
    });
    return () => {
      window.removeEventListener('popstate', surRetour);
      desabonner();
    };
  }, []);

  // Écran de lancement : visible dès l'ouverture, avant même le chargement du JavaScript
  if (!pret) return <Chargement texte="Ouverture de votre caisse…" />;

  return (
    <div className="app">
      {connecte ? <Coque /> : <><Connexion /><BulleChat /></>}
      {toast && (
        <div key={toast.id} className={`toast ${toast.type === 'erreur' ? 'erreur' : ''}`} role="status">
          {toast.texte}
        </div>
      )}
    </div>
  );
}
