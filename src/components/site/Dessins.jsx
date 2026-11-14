// Petits dessins du site (SVG légers, aux couleurs de la couleurs de Kaislo (vert, ocre)) : boutique, panier, téléphone.
// Décoratifs : cachés des lecteurs d'écran (le texte à côté dit déjà la même chose).
const VERT = '#1e5b43';
const OCRE = '#e2a431';
const BRUN = '#14211c';
const SABLE = '#f6f5f1';

const Cadre = ({ children }) => (
  <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true" focusable="false" className="dessin">{children}</svg>
);

export const DessinBoutique = () => (
  <Cadre>
    <rect x="14" y="40" width="68" height="44" fill={SABLE} stroke={BRUN} strokeWidth="3" />
    <path d="M8 40 L16 16 H80 L88 40 Z" fill={VERT} stroke={BRUN} strokeWidth="3" strokeLinejoin="round" />
    <path d="M8 40 q10 12 20 0 q10 12 20 0 q10 12 20 0 q10 12 20 0" fill={OCRE} stroke={BRUN} strokeWidth="3" strokeLinejoin="round" />
    <rect x="22" y="56" width="22" height="28" fill="#fff" stroke={BRUN} strokeWidth="3" />
    <rect x="54" y="56" width="20" height="14" fill={OCRE} stroke={BRUN} strokeWidth="3" />
  </Cadre>
);

export const DessinPanier = () => (
  <Cadre>
    <path d="M26 40 C26 16 70 16 70 40" fill="none" stroke={BRUN} strokeWidth="3" strokeLinecap="round" />
    <path d="M10 40 H86 L76 82 H20 Z" fill={OCRE} stroke={BRUN} strokeWidth="3" strokeLinejoin="round" />
    <path d="M34 40 L38 82 M48 40 V82 M62 40 L58 82" stroke={BRUN} strokeWidth="3" />
    <circle cx="36" cy="30" r="8" fill={VERT} stroke={BRUN} strokeWidth="3" />
    <circle cx="58" cy="28" r="7" fill="#fff" stroke={BRUN} strokeWidth="3" />
  </Cadre>
);

export const DessinTelephone = () => (
  <Cadre>
    <rect x="26" y="8" width="44" height="80" rx="6" fill={SABLE} stroke={BRUN} strokeWidth="3" />
    <path d="M34 24 H62 V50 H46 L38 58 V50 H34 Z" fill={VERT} stroke={BRUN} strokeWidth="3" strokeLinejoin="round" />
    <path d="M40 34 H56 M40 41 H52" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <rect x="34" y="62" width="28" height="16" fill={OCRE} stroke={BRUN} strokeWidth="3" />
  </Cadre>
);
