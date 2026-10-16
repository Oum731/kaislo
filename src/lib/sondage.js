// Relève régulière d'un serveur (discussions « en direct ») : appelle `fonction` tout de suite puis toutes les `ms` millisecondes,
// seulement quand l'onglet est visible (rien n'est demandé à l'arrière-plan), et reprend dès que l'onglet redevient visible.
import { useEffect, useRef } from 'react';

export function useSondage(fonction, ms, actif = true) {
  const ref = useRef(fonction);
  ref.current = fonction;
  useEffect(() => {
    if (!actif) return undefined;
    let arret = false;
    let minuterie = null;
    let enCours = false;
    const tour = async () => {
      if (enCours) return;
      enCours = true;
      clearTimeout(minuterie);
      if (!document.hidden) {
        try { await ref.current(); } catch { /* hors ligne : on réessaie au prochain tour */ }
      }
      enCours = false;
      if (!arret) minuterie = setTimeout(tour, ms);
    };
    const visible = () => { if (!document.hidden) tour(); };
    tour();
    document.addEventListener('visibilitychange', visible);
    return () => { arret = true; clearTimeout(minuterie); document.removeEventListener('visibilitychange', visible); };
  }, [ms, actif]);
}

/** Ajoute les nouveaux messages à la liste (par identifiant, dans l'ordre d'arrivée) */
export function fusionnerMessages(anciens, nouveaux) {
  if (!nouveaux?.length) return anciens;
  const connus = new Set(anciens.map((m) => m.id));
  const ajouts = nouveaux.filter((m) => !connus.has(m.id));
  return ajouts.length ? [...anciens, ...ajouts].sort((a, b) => (a.le < b.le ? -1 : a.le > b.le ? 1 : 0)) : anciens;
}
