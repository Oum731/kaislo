'use client';
// Lien « Gérer mes cookies » : rouvre le bandeau de mesure pour changer de choix (n'existe que si une mesure publicitaire est activée)
import { mesureActive, gererMesure } from '@/lib/mesure';
import { tr } from '@/lib/i18n';

export default function GererCookies({ className = 'lien-pied' }) {
  if (!mesureActive()) return null;
  return <button type="button" className={className} onClick={gererMesure}>{tr('Gérer mes cookies')}</button>;
}
