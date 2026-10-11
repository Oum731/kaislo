// Niveaux de qualité graphique. Auto : "bas" sur téléphone, "élevé" sur ordinateur,
// et dégradation automatique si le jeu rame.
export const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);
export const LEVELS = [
  { name: 'Bas', pr: 1.25, shadows: false, shadowSize: 512, seg: 110, trees: 0.35, particles: 0.35, fogFar: 300 },
  { name: 'Moyen', pr: 1.5, shadows: true, shadowSize: 1024, seg: 160, trees: 0.7, particles: 0.7, fogFar: 380 },
  { name: 'Élevé', pr: 2, shadows: true, shadowSize: 2048, seg: 200, trees: 1, particles: 1, fogFar: 420 },
];
export const autoLevel = () => (isMobile ? 0 : 2);
