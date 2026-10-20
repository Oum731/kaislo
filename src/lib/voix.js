// ------------------------------------------------------------
// VOIX : lecture à voix haute des articles, des totaux et de la monnaie à rendre (« Mode illustré »).
// Pour les vendeuses qui lisent peu : elles entendent « Attiéké, trois mille francs » en touchant un article, et le total avant d'encaisser.
// Utilise la synthèse vocale du téléphone (rien n'est envoyé nulle part) ; les nombres sont dits par la voix française de l'appareil.
// ------------------------------------------------------------

const NOMS_DEVISES = { FCFA: 'francs CFA', XOF: 'francs CFA', XAF: 'francs CFA', MAD: 'dirhams', DH: 'dirhams', EUR: 'euros', USD: 'dollars', CAD: 'dollars canadiens', GNF: 'francs guinéens' };

/** « 2500 FCFA » → « 2500 francs CFA » ; « 12,5 MAD » → « 12 virgule 50 dirhams » (la voix lit bien les nombres entiers) */
export function montantParle(montant, devise) {
  const m = Math.round(Number(montant) * 100) / 100;
  const entier = Math.trunc(m);
  const cts = Math.round((m - entier) * 100);
  const nombre = cts ? `${entier} virgule ${String(cts).padStart(2, '0')}` : String(entier);
  const nom = NOMS_DEVISES[devise] || devise || '';
  // « 1 franc », « 1 euro » : pas de pluriel pour un seul
  const singulier = entier === 1 && !cts ? nom.replace(/s\b/, '') : nom;
  return `${nombre} ${singulier}`.trim();
}

/** Phrase lue avant d'encaisser : « 2 articles : Attiéké, Garba. Total : 5000 francs CFA. » */
export function phrasePanier(lignes, total, devise) {
  const noms = lignes.map((l) => (l.quantite > 1 ? `${l.quantite} ${l.produitNom || l.nom}` : l.produitNom || l.nom));
  const n = lignes.reduce((x, l) => x + l.quantite, 0);
  return `${n} article${n > 1 ? 's' : ''} : ${noms.join(', ')}. Total : ${montantParle(total, devise)}.`;
}

export const voixDisponible = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Lit le texte à voix haute (la phrase précédente est interrompue) */
export function dire(texte, langue = 'fr-FR') {
  if (!voixDisponible() || !texte) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = langue;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch { /* pas de voix sur cet appareil : l'application marche comme avant */ }
}
