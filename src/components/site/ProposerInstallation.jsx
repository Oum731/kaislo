'use client';
// ------------------------------------------------------------
// « Installez Kaislo sur votre téléphone » : proposé une fois aux nouveaux visiteurs sur téléphone (pas sur ordinateur),
// seulement si Kaislo n'est pas déjà installé. Le geste proposé dépend de l'appareil (voir lib/installer-pwa.js) :
// un bouton quand le navigateur sait installer, sinon les 3 gestes à faire, expliqués un par un.
// « Plus tard » : on ne redemande qu'après 3 jours, puis 30 jours, puis plus jamais.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { Icone } from '@/components/ui';
import { chemin } from '@/config';
import { tr } from '@/lib/i18n';
import { enregistrerServiceWorker } from '@/lib/espace';
import { choisirParcours, doitProposer } from '@/lib/installer-pwa';

const CLE = 'kaislo_installation';
const DELAI = 6000; // laisse d'abord lire la page

// Le navigateur annonce très tôt qu'il sait installer : on garde son offre pour le bouton
let offre = null;
const abonnes = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); offre = e; abonnes.forEach((f) => f()); });
}

const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch { return null; } };
const ecrire = (etat) => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage bloqué */ } };
const dejaInstallee = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// Bouton « Partager » de Safari : un carré avec une flèche vers le haut
function IconePartager() {
  return (
    <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M5 11H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
  );
}

const ETAPES = () => ({
  ios: [
    <>{tr('Touchez le bouton')} <b>{tr('Partager')}</b> <IconePartager /> {tr('(le carré avec une flèche vers le haut, en bas de l’écran).')}</>,
    <>{tr('Faites défiler et touchez')} <b>{tr('« Sur l’écran d’accueil »')}</b>.</>,
    <>{tr('Touchez')} <b>{tr('Ajouter')}</b>{tr(', en haut à droite. C’est fini : l’icône Kaislo est sur votre écran.')}</>,
  ],
  'android-menu': [
    <>{tr('Touchez les trois points')} <b>⋮</b> {tr('en haut à droite du navigateur.')}</>,
    <>{tr('Touchez')} <b>{tr('« Installer l’application »')}</b> {tr('(ou « Ajouter à l’écran d’accueil »).')}</>,
    <>{tr('Confirmez avec')} <b>{tr('Installer')}</b>{tr('. L’icône Kaislo arrive sur votre écran.')}</>,
  ],
  ouvrir: [
    <>{tr('Touchez les trois points')} <b>⋮</b> {tr('(ou')} <b>{tr('Partager')}</b>{tr(') de cette fenêtre.')}</>,
    <>{tr('Choisissez')} <b>{tr('« Ouvrir dans Chrome »')}</b> {tr('(ou « Ouvrir dans Safari »).')}</>,
    <>{tr('Kaislo s’ouvre dans votre navigateur : vous pourrez alors l’installer en un geste.')}</>,
  ],
});

export default function ProposerInstallation() {
  const [parcours, setParcours] = useState(null); // null = rien à afficher
  const [guide, setGuide] = useState(false);
  const [copie, setCopie] = useState(false);
  const [, rafraichir] = useState(0);

  useEffect(() => {
    if (dejaInstallee() || !doitProposer(lire())) return undefined;
    const evaluer = () => choisirParcours({ ua: navigator.userAgent, plateforme: navigator.platform, pointsTactiles: navigator.maxTouchPoints, proposition: !!offre });
    if (!evaluer()) return undefined; // ordinateur : rien à proposer
    enregistrerServiceWorker(); // Chrome n'annonce l'installation qu'avec un service worker actif
    const f = () => { rafraichir((n) => n + 1); setParcours((p) => (p ? evaluer() : p)); };
    abonnes.add(f);
    const minuterie = setTimeout(() => setParcours(evaluer()), DELAI);
    const installee = () => { ecrire({ ...(lire() || {}), installe: true }); setParcours(null); };
    window.addEventListener('appinstalled', installee);
    return () => { abonnes.delete(f); clearTimeout(minuterie); window.removeEventListener('appinstalled', installee); };
  }, []);

  if (!parcours) return null;
  const plusTard = () => { const e = lire() || {}; ecrire({ ...e, refus: (e.refus || 0) + 1, dernier: Date.now() }); setParcours(null); };
  const installer = async () => {
    if (!offre) { setParcours('android-menu'); setGuide(true); return; } // l'offre du navigateur a disparu : on explique les gestes
    offre.prompt();
    const choix = await offre.userChoice.catch(() => null);
    offre = null;
    if (choix?.outcome === 'accepted') { ecrire({ ...(lire() || {}), installe: true }); setParcours(null); } else plusTard();
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopie(true); } catch { setGuide(true); }
  };
  const etapes = ETAPES()[parcours];
  return (
    <div className="proposer-install" role="dialog" aria-label={tr('Installer Kaislo sur votre téléphone')}>
      <button type="button" className="proposer-install-fermer icone-btn" onClick={plusTard} aria-label={tr('Plus tard')}><Icone nom="fermer" taille="sm" /></button>
      <div className="proposer-install-tete">
        <img src={chemin('/icons/icone-192.png')} alt="" width="48" height="48" />
        <div>
          <b>{parcours === 'ouvrir' ? tr('Ouvrez Kaislo dans votre navigateur') : tr('Installez Kaislo sur votre téléphone')}</b>
          <p className="petit muet">{parcours === 'ouvrir' ? tr('Cette fenêtre ne permet pas d’installer. Deux gestes et c’est réglé.') : tr('Un seul geste : Kaislo s’ouvre en plein écran, comme une application, même sans internet.')}</p>
        </div>
      </div>
      {(guide || parcours === 'ouvrir') && etapes && (
        <ol className="proposer-install-etapes">{etapes.map((e, i) => <li key={i}>{e}</li>)}</ol>
      )}
      <div className="proposer-install-actions">
        {parcours === 'bouton' && <button type="button" className="btn grand" onClick={installer}><Icone nom="installer" taille="sm" /> {tr('Installer maintenant')}</button>}
        {parcours === 'ouvrir' && <button type="button" className="btn grand" onClick={copier}>{copie ? tr('Lien copié : collez-le dans Chrome') : tr('Copier le lien')}</button>}
        {(parcours === 'ios' || parcours === 'android-menu') && !guide && <button type="button" className="btn grand" onClick={() => setGuide(true)}>{tr('Voir comment faire')}</button>}
        {(parcours === 'ios' || parcours === 'android-menu') && guide && <button type="button" className="btn grand" onClick={plusTard}>{tr('J’ai compris')}</button>}
        <button type="button" className="btn secondaire" onClick={plusTard}>{tr('Plus tard')}</button>
      </div>
    </div>
  );
}
