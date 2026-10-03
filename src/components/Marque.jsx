// ------------------------------------------------------------
// Marque Kaislo : un K dont la jambe se termine par une « boîte »
// (la caisse et le stock). Même dessin que les icônes (scripts/generer-icones.mjs).
// La taille se règle en CSS (.logo-marque) ou avec « taille ».
// ------------------------------------------------------------
export default function Marque({ taille, className = '' }) {
  return (
    <svg className={'logo-marque ' + className} viewBox="0 0 64 64" width={taille} height={taille} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#1E5B43" />
      <g fill="none" stroke="#F6F5F1" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v34" />
        <path d="M42 15L24 33l11 10" />
      </g>
      <rect x="35.5" y="38.5" width="13" height="13" rx="2.8" fill="#E8A317" />
    </svg>
  );
}
