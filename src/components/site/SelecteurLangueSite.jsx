'use client';
// Lien discret vers la même page dans l'autre langue (petit globe + FR / EN, sans cadre)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { autreLangue } from '@/lib/site-routes';

export default function SelecteurLangueSite({ lang }) {
  const page = usePathname() || '/';
  const cible = lang === 'en'
    ? { libelle: 'FR', titre: 'Voir cette page en français', adresse: autreLangue(page)?.adresse || '/', langue: 'fr' }
    : { libelle: 'EN', titre: 'View this page in English', adresse: autreLangue(page)?.adresse || '/en/', langue: 'en' };
  return (
    <Link href={cible.adresse} className="lien-langue" hrefLang={cible.langue} lang={cible.langue} title={cible.titre} aria-label={cible.titre}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></svg>
      {cible.libelle}
    </Link>
  );
}
