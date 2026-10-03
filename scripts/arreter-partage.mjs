// ------------------------------------------------------------
// ARRÊTER LE PARTAGE : ferme le tunnel Cloudflare et le petit serveur
// lancés par « npm run partager » (même s'ils tournent sans fenêtre).
//   npm run arreter-partage
// ------------------------------------------------------------
import { execSync } from 'node:child_process';

// Commande PowerShell : trouve les processus du partage et les arrête
const commande = [
  'Get-CimInstance Win32_Process | Where-Object {',
  "  ($_.Name -eq 'cloudflared.exe' -and $_.ExecutablePath -like '*Kaislo*outils*') -or",
  "  ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*partager.mjs*')",
  '} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; $_.Name + " (" + $_.ProcessId + ")" }',
].join(' ');

try {
  const sortie = execSync('powershell -NoProfile -Command "' + commande.replace(/"/g, '\\"') + '"', { encoding: 'utf8' }).trim();
  console.log(sortie ? 'Partage arrêté : ' + sortie.split(/\r?\n/).join(', ') : 'Aucun partage en cours.');
} catch (e) {
  console.error('Impossible d’arrêter le partage : ' + e.message);
}
