// ------------------------------------------------------------
// GARDE DES DEUX BARRES DU BAS (choix des cookies, « Installer Kaislo »)
//
// Les deux barres sont écrites dans la page générée à l'avance : elles sont donc là dès le premier affichage, au lieu d'apparaître d'un coup
// quand le programme du site a fini de se charger (un changement tardif de l'écran que Google PageSpeed compte contre le « Speed Index »).
// Ce petit script, lancé avant l'affichage, repère les visiteurs pour qui une barre ne doit PAS apparaître et le note sur la page :
//  - data-mesure="fait"   : le visiteur a déjà répondu au bandeau des cookies (kaislo-mesure = oui ou non) ;
//  - data-install="non"   : Kaislo est déjà installé (ouvert comme une application), ou le visiteur ne doit pas revoir la barre
//                           (installation faite ; sinon règle de lib/installer-pwa.js : 3 jours après un 1er refus, 30 jours après le 2e, jamais après 3).
// Le style cache alors la barre (voir globals.css). Les composants refont la même vérification et retirent la barre de la page.
// ------------------------------------------------------------
// Règles de style des deux barres (voir ci-dessus) : la barre ne clignote pas pour qui n'en veut pas, et celle de l'installation n'apparaît jamais sur ordinateur.
// Elles sont posées par le script lui-même, dans <head> : hors de l'arbre de la page que React reprend au chargement (une balise <style> écrite dans la page
// était réécrite par l'outil de CSS critique et faisait échouer cette reprise), et avant tout affichage.
export const STYLE_GARDE_BARRES =
  'html[data-mesure="fait"] .bandeau-mesure,html[data-install="non"] .proposer-install{display:none!important}' +
  '@media (min-width:900px),(hover:hover) and (pointer:fine){.proposer-install{display:none!important}}';

export const SCRIPT_GARDE_BARRES =
  "try{var d=document.documentElement,m=localStorage.getItem('kaislo-mesure');if(m==='oui'||m==='non')d.setAttribute('data-mesure','fait');" +
  "var i=JSON.parse(localStorage.getItem('kaislo_installation')||'null'),r=i&&i.refus||0," +
  "ok=!i||(!i.installe&&(r===0||(r<3&&Date.now()-(i.dernier||0)>=(r===1?3:30)*864e5)))," +
  "s=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;" +
  "if(!ok||s)d.setAttribute('data-install','non')}catch(e){}" +
  "try{var y=document.createElement('style');y.textContent=" + JSON.stringify(STYLE_GARDE_BARRES) + ";document.head.appendChild(y)}catch(e){}";
