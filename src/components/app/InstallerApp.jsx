'use client';
// ------------------------------------------------------------
// Installer Kaislo sur l'écran d'accueil du téléphone.
//   - Android / ordinateur (Chrome, Edge) : bouton « Installer » direct
//   - iPhone / iPad (Safari) : pas de bouton possible, on explique les 2 gestes
// Une fois installée, Kaislo s'ouvre en plein écran, comme une application.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Icone } from '@/components/ui';

// Le navigateur propose l'installation très tôt : on garde sa proposition pour le bouton
let propositionInstallation = null;
const abonnes = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    propositionInstallation = e;
    abonnes.forEach((f) => f());
  });
}

const estIos = () => typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const estInstallee = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);

export default function InstallerApp() {
  const s = useKaislo();
  const [, rafraichir] = useState(0);
  const [client, setClient] = useState(false); // évite un affichage différent entre serveur et navigateur
  useEffect(() => {
    setClient(true);
    const f = () => rafraichir((n) => n + 1);
    abonnes.add(f);
    return () => abonnes.delete(f);
  }, []);
  if (!client || estInstallee() || s.prefs.installationMasquee) return null;
  const masquer = () => s.sauverPrefs({ installationMasquee: true });

  if (estIos()) {
    return (
      <div className="carte pile installer-app">
        <div className="ligne espace">
          <b>Installer Kaislo sur votre iPhone</b>
          <button className="icone-btn" onClick={masquer} aria-label="Masquer"><Icone nom="fermer" taille="sm" /></button>
        </div>
        <ol className="petit">
          <li>Dans Safari, touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li>
          <li>Choisissez <b>« Sur l’écran d’accueil »</b>, puis <b>Ajouter</b>.</li>
        </ol>
        <p className="tres-petit muet">Kaislo s’ouvrira en plein écran, comme une application, avec Face ID. Tickets : imprimante compatible AirPrint ou envoi par WhatsApp.</p>
      </div>
    );
  }
  if (!propositionInstallation) return null;
  const installer = async () => {
    propositionInstallation.prompt();
    await propositionInstallation.userChoice.catch(() => {});
    propositionInstallation = null;
    rafraichir((n) => n + 1);
  };
  return (
    <div className="carte ligne espace installer-app">
      <div>
        <b>Installer l’application Kaislo</b>
        <p className="tres-petit muet">Sur l’écran d’accueil, en plein écran, même sans internet.</p>
      </div>
      <button className="btn petit" onClick={installer}><Icone nom="installer" taille="sm" /> Installer</button>
    </div>
  );
}
