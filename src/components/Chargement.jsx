// ------------------------------------------------------------
// Écran de chargement : logo Kaisly entouré d'un anneau qui tourne.
// Uniquement du HTML + CSS : il s'affiche dès la première image,
// avant même que le JavaScript soit téléchargé (connexions lentes).
// Utilisé au lancement de l'application, de l'espace Amorac,
// et entre deux pages du site (src/app/loading.js).
// ------------------------------------------------------------

/**
 * texte : message sous le logo · plein : occupe tout l'écran (sinon une zone de page)
 */
export default function Chargement({ texte = 'Chargement…', plein = true }) {
  return (
    <div className={`chargement ${plein ? 'plein' : ''}`} role="status" aria-live="polite">
      <div className="chargement-logo" aria-hidden="true">
        <span className="chargement-anneau" />
        <span className="logo-marque">K</span>
      </div>
      <p className="chargement-texte">{texte}</p>
      {/* Apparaît seulement si le chargement dure (voir l'animation dans globals.css) */}
      <p className="chargement-lent">Connexion lente ? Kaisly se charge, merci de patienter.</p>
    </div>
  );
}
