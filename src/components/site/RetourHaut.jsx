'use client';
// ------------------------------------------------------------
// Bouton « Retour en haut » du site public : apparaît quand on a descendu la page, remonte en douceur.
// En bas à gauche (la bulle de discussion est en bas à droite). Pas d'animation si le visiteur l'a désactivée.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Icone } from '@/components/ui';
import { tr } from '@/lib/i18n';

export default function RetourHaut() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const maj = () => setVisible(window.scrollY > 700);
    maj();
    window.addEventListener('scroll', maj, { passive: true });
    return () => window.removeEventListener('scroll', maj);
  }, []);
  if (!visible) return null;
  const monter = () => {
    const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calme ? 'auto' : 'smooth' });
  };
  return (
    <button type="button" className="retour-haut" onClick={monter} aria-label={tr('Retour en haut')} title={tr('Retour en haut')}>
      <Icone nom="haut" />
    </button>
  );
}
