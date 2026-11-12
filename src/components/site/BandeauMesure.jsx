'use client';
// ------------------------------------------------------------
// Bandeau « Accepter / Refuser » pour la mesure des inscriptions (Google Ads, pixel Meta).
// N'existe que si GOOGLE_ADS_ID ou FACEBOOK_PIXEL_ID est rempli (src/config.js) ; jamais dans /admin/ et /commercial/.
// Écrit dans la page générée à l'avance (donc visible dès le premier affichage, sans apparaître d'un coup après le chargement du programme) ;
// le script lib/garde-barres.js le cache avant l'affichage pour qui a déjà répondu. Position fixe : aucun décalage de la mise en page.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GOOGLE_ADS_ID, FACEBOOK_PIXEL_ID } from '@/config';
import { mesureActive, pageSansMesure, choixMesure, accepterMesure, refuserMesure, chargerBaliseAuRepos } from '@/lib/mesure';

const nomsRegies = (et) => [GOOGLE_ADS_ID && 'Google', FACEBOOK_PIXEL_ID && 'Facebook / Instagram'].filter(Boolean).join(et);
const TEXTES = {
  fr: () => ({
    titre: 'Mesurer nos publicités ?',
    texte: `De petits cookies pour savoir quelles publicités (${nomsRegies(' et ')}) amènent de vrais commerces. Jamais vos ventes ni vos clients ; refuser ne change rien.`,
    accepter: 'Accepter', refuser: 'Refuser', plus: 'En savoir plus sur les cookies', lien: '/cookies/',
  }),
  en: () => ({
    titre: 'Measure our ads?',
    texte: `Small cookies to know which ads (${nomsRegies(' and ')}) bring real businesses. Never your sales or your customers; declining changes nothing.`,
    accepter: 'Accept', refuser: 'Decline', plus: 'Learn more about cookies', lien: '/cookies/',
  }),
};

export default function BandeauMesure() {
  const chemin = usePathname() || '';
  const dansApp = chemin.startsWith('/app'); // dans l'application, les fenêtres (reçu, clôture…) passent au-dessus du bandeau
  // Même rendu côté serveur et au premier rendu du navigateur : présent si la mesure existe et si la page en a une
  const [visible, setVisible] = useState(() => mesureActive() && !pageSansMesure(chemin));
  const [t, setT] = useState(() => (chemin.startsWith('/en/') ? TEXTES.en() : TEXTES.fr()));
  useEffect(() => {
    if (!mesureActive() || pageSansMesure(window.location.pathname)) { setVisible(false); return; }
    const choix = choixMesure();
    if (choix === 'oui') { setVisible(false); return chargerBaliseAuRepos(); }
    if (choix === 'non') { setVisible(false); return; }
    // Application ouverte sur un téléphone en anglais : le texte passe en anglais (le reste du site connaît sa langue par son adresse)
    if (window.location.pathname.startsWith('/app') && /^en/i.test(navigator.language || '')) setT(TEXTES.en());
  }, []);
  // « Gérer mes cookies » (pied de page, page Cookies) : le bandeau revient pour changer de choix
  useEffect(() => {
    const rouvrir = () => { if (mesureActive()) setVisible(true); };
    window.addEventListener('kaislo-gerer-mesure', rouvrir);
    return () => window.removeEventListener('kaislo-gerer-mesure', rouvrir);
  }, []);
  if (!visible) return null;
  const choisir = (accepte) => {
    (accepte ? accepterMesure : refuserMesure)();
    document.documentElement.setAttribute('data-mesure', 'fait');
    setVisible(false);
  };
  return (
    <div className={'bandeau-mesure' + (dansApp ? ' dans-app' : '')} role="dialog" aria-live="polite" aria-label={t.titre}>
      <p><b>{t.titre}</b> {t.texte} <Link href={t.lien}>{t.plus}</Link></p>
      <div className="bandeau-mesure-actions">
        <button className="btn secondaire petit" onClick={() => choisir(false)}>{t.refuser}</button>
        <button className="btn secondaire petit" onClick={() => choisir(true)}>{t.accepter}</button>
      </div>
    </div>
  );
}
