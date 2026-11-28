// ------------------------------------------------------------
// Marque Kaislo : le K du logo de la marque (le logo fourni, public/logo/kaislo-source.jpg), découpé en tuile
// par scripts/generer-icones.mjs (public/logo/kaislo-marque-96.png). La taille se règle en CSS (.logo-marque) ou avec « taille ».
// ------------------------------------------------------------
import { chemin } from '@/config';

export default function Marque({ taille, className = '' }) {
  return <img className={'logo-marque ' + className} src={chemin('/logo/kaislo-marque-96.png')} width={taille} height={taille} alt="" aria-hidden="true" />;
}
