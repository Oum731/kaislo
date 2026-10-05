'use client';
// Lien vers la même page dans l'autre langue (français / English)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { autreLangue } from '@/lib/site-routes';

export default function SelecteurLangueSite({ lang }) {
  const page = usePathname() || '/';
  const cible = lang === 'en'
    ? { libelle: 'FR', titre: 'Voir cette page en français', adresse: autreLangue(page)?.adresse || '/', langue: 'fr' }
    : { libelle: 'EN', titre: 'View this page in English', adresse: autreLangue(page)?.adresse || '/en/', langue: 'en' };
  return <Link href={cible.adresse} className="btn secondaire petit" hrefLang={cible.langue} lang={cible.langue} title={cible.titre} aria-label={cible.titre}>{cible.libelle}</Link>;
}
