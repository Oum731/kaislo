'use client';
// Boutons de l'en-tête du site : « Se connecter » et « Essai gratuit » pour un visiteur,
// « Mon espace » pour quelqu'un qui est déjà connecté sur cet appareil.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ADRESSES_ESPACES, espaceMemorise, quitterLeSite } from '@/lib/espace';

export default function BoutonsEspace({ libelleConnexion, libelleEssai, libelleEspace, lienInscription }) {
  const [espace, setEspace] = useState(null);
  useEffect(() => setEspace(espaceMemorise()), []);
  // « Mon espace » ramène au tableau de bord (et remet la redirection automatique de l'accueil)
  if (espace) return <Link prefetch={false} href={ADRESSES_ESPACES[espace]} className="btn petit" onClick={quitterLeSite}>{libelleEspace}</Link>;
  return (
    <>
      <Link prefetch={false} href="/app/" className="btn secondaire petit">{libelleConnexion}</Link>
      <Link prefetch={false} href={lienInscription} className="btn petit">{libelleEssai}</Link>
    </>
  );
}
