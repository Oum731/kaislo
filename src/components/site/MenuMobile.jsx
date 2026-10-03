'use client';
// ------------------------------------------------------------
// Menu du site sur petit écran : bouton ☰ qui ouvre la liste des liens.
// (Sur grand écran, les liens sont directement dans l'en-tête.)
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icone } from '@/components/ui';

export default function MenuMobile({ liens, lienInscription }) {
  const [ouvert, setOuvert] = useState(false);
  const page = usePathname();

  // Fermer en changeant de page, ou avec la touche Échap
  useEffect(() => setOuvert(false), [page]);
  useEffect(() => {
    if (!ouvert) return;
    const touche = (e) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ouvert]);

  const fermer = () => setOuvert(false);
  return (
    <>
      <button className="bouton-menu-site" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} aria-controls="menu-mobile-site" aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}>
        <Icone nom={ouvert ? 'fermer' : 'menu'} />
      </button>
      {ouvert && (
        <>
          <div className="menu-site-voile" onClick={fermer} aria-hidden="true" />
          <nav id="menu-mobile-site" className="menu-site-panneau" aria-label="Menu du site">
            {liens.map(([lien, nom]) => <Link key={lien} href={lien} onClick={fermer}>{nom}</Link>)}
            <div className="menu-site-actions">
              <Link href="/app/" className="btn secondaire bloc" onClick={fermer}>Se connecter</Link>
              <Link href={lienInscription} className="btn bloc" onClick={fermer}>Essai gratuit 30 jours</Link>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
