// Crée moto-cross.zip à partir de dist/ (format demandé par les plateformes).
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
if (existsSync('moto-cross.zip')) rmSync('moto-cross.zip');
try {
  if (process.platform === 'win32') execSync('powershell -NoProfile -Command "Compress-Archive -Path dist/* -DestinationPath moto-cross.zip"', { stdio: 'inherit' });
  else execSync('cd dist && zip -r -q ../moto-cross.zip .', { stdio: 'inherit' });
  console.log('✔ moto-cross.zip créé');
} catch (e) { console.error('Impossible de créer le zip automatiquement : compressez le contenu du dossier dist/.'); process.exit(1); }
