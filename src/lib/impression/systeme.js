// ------------------------------------------------------------
// IMPRESSION PAR LE SYSTÈME (sans Bluetooth) : ouvre la fenêtre
// d'impression du téléphone ou de l'ordinateur, avec le ticket
// mis en page à la largeur du papier (58 ou 80 mm).
//
// Sert sur iPhone (pas de Bluetooth dans Safari) avec une imprimante
// AirPrint, et sur ordinateur avec une imprimante de tickets USB ou réseau.
// ------------------------------------------------------------
import { lireImage } from '../donnees/images.js';
import { CARACTERES } from './ticket.js';

const echapper = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** lignes : même format que pour l'imprimante Bluetooth ({ texte, gras, grand } ou { logo, ref }) */
export async function imprimerSysteme(lignes, largeurMm = 58) {
  document.getElementById('impression-systeme')?.remove();
  const zone = document.createElement('div');
  zone.id = 'impression-systeme';
  // Le ticket est fait de colonnes fixes (32 caractères en 58 mm, 48 en 80 mm) :
  // la taille du texte est calculée pour qu'une ligne remplisse juste la largeur du papier
  const colonnes = CARACTERES[largeurMm] || 32;
  const taille = ((largeurMm - 4) / colonnes / 0.6).toFixed(2); // un caractère Courier fait 0,6 fois sa hauteur
  let html = `<style>@page { size: ${largeurMm}mm auto; margin: 2mm; } #impression-systeme { width: ${largeurMm - 4}mm; font-size: ${taille}mm !important; } #impression-systeme .is-grand { font-size: 1em; }</style>`;
  for (const l of lignes) {
    if (l.logo) {
      const src = await lireImage(l.ref).catch(() => null);
      if (src) html += `<img src="${echapper(src)}" alt="" class="is-logo">`;
      continue;
    }
    html += `<div class="${l.gras ? 'is-gras ' : ''}${l.grand ? 'is-grand' : ''}">${echapper(l.texte) || '&nbsp;'}</div>`;
  }
  zone.innerHTML = html;
  document.body.appendChild(zone);
  document.body.classList.add('impression-systeme');
  const nettoyer = () => {
    document.body.classList.remove('impression-systeme');
    zone.remove();
    window.removeEventListener('afterprint', nettoyer);
  };
  window.addEventListener('afterprint', nettoyer);
  // Laisse le temps d'afficher le logo avant d'ouvrir la fenêtre d'impression
  await new Promise((r) => setTimeout(r, 120));
  window.print();
  setTimeout(nettoyer, 60000); // au cas où « afterprint » n'arrive pas (certains téléphones)
}
