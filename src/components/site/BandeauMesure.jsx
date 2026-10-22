'use client';
// ------------------------------------------------------------
// Bandeau « Accepter / Refuser » pour la mesure des inscriptions (Google Ads, pixel Meta).
// N'existe que si GOOGLE_ADS_ID ou FACEBOOK_PIXEL_ID est rempli (src/config.js) ; jamais dans /admin/ et /commercial/.
// Affiché seulement côté navigateur, après le chargement : aucun effet sur le calcul de la mise en page (pas de décalage).
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GOOGLE_ADS_ID, FACEBOOK_PIXEL_ID } from '@/config';
import { mesureActive, pageSansMesure, choixMesure, accepterMesure, refuserMesure, chargerBaliseAuRepos } from '@/lib/mesure';

const nomsRegies = (et) => [GOOGLE_ADS_ID && 'Google', FACEBOOK_PIXEL_ID && 'Facebook / Instagram'].filter(Boolean).join(et);
const TEXTES = {
  fr: () => ({
    titre: 'Mesurer nos publicités ?',
    texte: `De petits cookies pour savoir quelles publicités (${nomsRegies(' et ')}) amènent de vrais commerces. Jamais vos ventes ni vos clients ; refuser ne change rien.`,
    accepter: 'Accepter', refuser: 'Refuser', plus: 'En savoir plus', lien: '/cookies/',
  }),
  en: () => ({
    titre: 'Measure our ads?',
    texte: `Small cookies to know which ads (${nomsRegies(' and ')}) bring real businesses. Never your sales or your customers; declining changes nothing.`,
    accepter: 'Accept', refuser: 'Decline', plus: 'Learn more', lien: '/cookies/',
  }),
};

export default function BandeauMesure() {
  const [visible, setVisible] = useState(false);
  const [dansApp, setDansApp] = useState(false); // dans l'application, les fenêtres (reçu, clôture…) passent au-dessus du bandeau
  const [t, setT] = useState(() => TEXTES.fr());
  useEffect(() => {
    if (!mesureActive() || pageSansMesure(window.location.pathname)) return;
    const choix = choixMesure();
    if (choix === 'oui') return chargerBaliseAuRepos();
    if (choix === 'non') return;
    const anglais = window.location.pathname.startsWith('/en/') || (window.location.pathname.startsWith('/app') && /^en/i.test(navigator.language || ''));
    setDansApp(window.location.pathname.startsWith('/app'));
    setT(anglais ? TEXTES.en() : TEXTES.fr());
    setVisible(true);
  }, []);
  if (!visible) return null;
  const choisir = (accepte) => { (accepte ? accepterMesure : refuserMesure)(); setVisible(false); };
  return (
    <div className={'bandeau-mesure' + (dansApp ? ' dans-app' : '')} role="dialog" aria-live="polite" aria-label={t.titre}>
      <p><b>{t.titre}</b> {t.texte} <Link href={t.lien}>{t.plus}</Link></p>
      <div className="bandeau-mesure-actions">
        <button className="btn secondaire petit" onClick={() => choisir(false)}>{t.refuser}</button>
        <button className="btn petit" onClick={() => choisir(true)}>{t.accepter}</button>
      </div>
    </div>
  );
}
