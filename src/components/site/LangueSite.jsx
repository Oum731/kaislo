'use client';
// ------------------------------------------------------------
// Langue de la page du site : règle la langue du navigateur pour les composants interactifs,
// l'attribut lang de la page, et mémorise la langue lue (l'application s'ouvrira dans la même langue).
// À placer en premier dans la page : il est rendu avant les autres composants.
// ------------------------------------------------------------
import { useEffect } from 'react';
import { choisirLangue, memoriserLangueSite } from '@/lib/i18n';

export default function LangueSite({ lang }) {
  choisirLangue(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    memoriserLangueSite(lang);
  }, [lang]);
  return null;
}
