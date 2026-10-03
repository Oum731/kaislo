'use client';
// ------------------------------------------------------------
// Petits composants réutilisés partout : icônes, fenêtres,
// interrupteurs, onglets, aperçu de ticket…
// ------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { lireImage, estImageLocale, adresseImage, reduireImage } from '@/lib/donnees/images';
import { normaliserTelephone, exempleTelephone, indicatifPays } from '@/lib/donnees/telephone';

// Dessins des icônes (style "Lucide", trait de 2 px)
const DESSINS = {
  accueil: <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  caisse: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  tables: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8" /><path d="M19 12v8" /><path d="M8 4h8" /></>,
  ventes: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></>,
  clients: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  produits: <><rect width="7" height="7" x="3" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="14" rx="1.5" /><rect width="7" height="7" x="3" y="14" rx="1.5" /></>,
  stock: <><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>,
  reglages: <><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></>,
  imprimante: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  moins: <path d="M5 12h14" />,
  fermer: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  ok: <path d="M20 6 9 17l-5-5" />,
  droite: <path d="m9 18 6-6-6-6" />,
  gauche: <path d="m15 18-6-6 6-6" />,
  haut: <path d="m18 15-6-6-6 6" />,
  bas: <path d="m6 9 6 6 6-6" />,
  poubelle: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></>,
  recherche: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 7v10" /><path d="M12 7v10" /><path d="M17 7v10" /></>,
  bluetooth: <path d="m7 7 10 10-5 5V2l5 5L7 17" />,
  effacer: <><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" /><line x1="18" x2="12" y1="9" y2="15" /><line x1="12" x2="18" y1="9" y2="15" /></>,
  alerte: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  hausse: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  baisse: <><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></>,
  sortie: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>,
  remise: <><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  cuisine: <><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" /><line x1="6" x2="18" y1="17" y2="17" /></>,
  whatsapp: <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />,
  menu: <><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></>,
  horloge: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  telephone: <><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></>,
  ecran: <><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></>,
  bouclier: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  carnet: <><path d="M2 6h4" /><path d="M2 10h4" /><path d="M2 14h4" /><path d="M2 18h4" /><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M16 2v20" /></>,
  depense: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></>,
  installer: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>,
  photo: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
  carte: <><path d="M20 10c0 4.99-5.54 10.19-7.4 11.79a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>,
  cible: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  lienExterne: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  etoile: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
};

export function Icone({ nom, taille = '', style, className = '' }) {
  return (
    <svg className={`ic ${taille ? 'ic-' + taille : ''} ${className}`} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {DESSINS[nom]}
    </svg>
  );
}

/**
 * Fenêtre : monte du bas sur téléphone, s'affiche au centre sur grand écran.
 * Se ferme avec le voile, la croix ou la touche Échap.
 */
export function Feuille({ titre, sousTitre, surFermer, children, pied, pleine = false, large = false, avant = null }) {
  useEffect(() => {
    const echap = (e) => e.key === 'Escape' && surFermer?.();
    window.addEventListener('keydown', echap);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', echap);
      document.body.style.overflow = '';
    };
  }, [surFermer]);
  return (
    <>
      <div className="voile" onClick={surFermer} />
      <div className={`feuille ${pleine ? 'pleine' : ''} ${large ? 'large' : ''}`} role="dialog" aria-modal="true" aria-label={titre}>
        <div className="feuille-poignee" />
        {(titre || surFermer) && (
          <div className="feuille-tete">
            {avant}
            <div className="titres">
              {titre && <h2>{titre}</h2>}
              {sousTitre && <p className="petit muet">{sousTitre}</p>}
            </div>
            {surFermer && (
              <button className="bouton-rond" onClick={surFermer} aria-label="Fermer">
                <Icone nom="fermer" />
              </button>
            )}
          </div>
        )}
        <div className="feuille-corps">{children}</div>
        {pied && <div className="feuille-pied">{pied}</div>}
      </div>
    </>
  );
}

export function Interrupteur({ actif, surChanger, label }) {
  return <button type="button" className={`interrupteur ${actif ? 'on' : ''}`} onClick={() => surChanger(!actif)} aria-pressed={actif} aria-label={label} />;
}

// Ligne "texte + interrupteur"
export function Reglage({ titre, aide, actif, surChanger }) {
  return (
    <div className="ligne">
      <div className="grandit">
        <b>{titre}</b>
        {aide && <p className="tres-petit muet">{aide}</p>}
      </div>
      <Interrupteur actif={actif} surChanger={surChanger} label={titre} />
    </div>
  );
}

// Onglets : options = [[valeur, libellé], …]
export function Segment({ options, valeur, surChanger }) {
  return (
    <div className="segment" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={valeur === v} className={valeur === v ? 'actif' : ''} onClick={() => surChanger(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Puces({ options, valeur, surChanger }) {
  return (
    <div className="puces">
      {options.map(([v, l]) => (
        <button key={v} className={`puce ${valeur === v ? 'actif' : ''}`} onClick={() => surChanger(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function initiales(nom) {
  return (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
}

export function Avatar({ nom, gerant, grand, onClick }) {
  const Balise = onClick ? 'button' : 'span';
  return (
    <Balise className={`avatar ${gerant ? 'gerant' : ''} ${grand ? 'grand' : ''}`} onClick={onClick} aria-label={onClick ? 'Mon compte' : undefined}>
      {initiales(nom)}
    </Balise>
  );
}

// Aperçu d'un ticket : exactement les lignes envoyées à l'imprimante
export function ApercuTicket({ lignes, largeur }) {
  return (
    <div className={`ticket l${largeur}`}>
      {lignes.map((l, i) =>
        l.logo ? (
          <ImageStockee key={i} reference={l.ref} className="ticket-logo" alt="Logo" />
        ) : (
          <div key={i} className={`${l.gras ? 't-gras' : ''} ${l.grand ? 't-grand' : ''}`}>{l.texte || ' '}</div>
        )
      )}
    </div>
  );
}

// ---------- Images (photos des articles, logo) ----------

// Lit une image enregistrée (ou une adresse de fichier) pour l'afficher
export function useImage(reference) {
  const [src, setSrc] = useState(() => (reference && !estImageLocale(reference) ? adresseImage(reference) : null));
  useEffect(() => {
    let actif = true;
    if (!reference) setSrc(null);
    else lireImage(reference).then((s) => actif && setSrc(s));
    return () => { actif = false; };
  }, [reference]);
  return src;
}

// Affiche l'image, ou "secours" (emoji, initiales…) tant qu'il n'y en a pas
export function ImageStockee({ reference, alt = '', className = '', secours = null }) {
  const src = useImage(reference);
  if (!src) return secours;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

/**
 * Choix d'une photo : appareil photo ou galerie (le téléphone propose les deux).
 * reference : image déjà enregistrée · nouvelle : photo choisie mais pas encore enregistrée
 */
export function ChoixImage({ reference, nouvelle, retiree, surChoisir, surRetirer, libelle = 'Ajouter une photo', forme = 'carree' }) {
  const champ = useRef(null);
  const [erreur, setErreur] = useState('');
  const existante = useImage(retiree ? null : reference);
  const affichee = nouvelle || existante;
  const choisir = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    try {
      setErreur('');
      surChoisir(await reduireImage(fichier, forme === 'logo' ? 500 : 600));
    } catch (err) {
      setErreur(err.message);
    }
  };
  return (
    <div className={`choix-image ${forme}`}>
      <button type="button" className="choix-image-zone" onClick={() => champ.current.click()} aria-label={libelle}>
        {affichee ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affichee} alt="" />
        ) : (
          <span className="choix-image-vide"><Icone nom="photo" taille="lg" /><span className="petit">{libelle}</span></span>
        )}
      </button>
      <div className="choix-image-actions">
        <button type="button" className="btn secondaire petit" onClick={() => champ.current.click()}>
          <Icone nom="photo" taille="sm" /> {affichee ? 'Changer' : 'Choisir'}
        </button>
        {affichee && <button type="button" className="btn fantome petit" onClick={surRetirer}>Retirer</button>}
      </div>
      {erreur && <p className="alerte">{erreur}</p>}
      <input ref={champ} type="file" accept="image/*" hidden onChange={choisir} />
    </div>
  );
}

export function Vide({ emoji, titre, texte, children }) {
  return (
    <div className="vide">
      <div className="emoji">{emoji}</div>
      <p><b>{titre}</b></p>
      {texte && <p className="petit" style={{ marginTop: 4 }}>{texte}</p>}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}

/**
 * Numéro de téléphone selon le pays : l'indicatif est affiché devant, le numéro est vérifié
 * quand on quitte le champ (format international montré en vert, ou erreur en rouge).
 * Le parent garde la saisie brute et appelle normaliserTelephone() avant d'enregistrer.
 */
export function ChampTelephone({ libelle, valeur, surChanger, pays, aide, autoFocus, onKeyDown, champRef, requis = true, verifier = true }) {
  const [vu, setVu] = useState(false); // vérifier seulement après la première sortie du champ
  const n = valeur && verifier ? normaliserTelephone(valeur, pays) : null; // démos : numéros fictifs, pas de vérification
  const indicatif = indicatifPays(pays);
  return (
    <label className="champ">
      <span>{libelle}{requis ? '' : ' (facultatif)'}</span>
      <span className="champ-telephone">
        {indicatif && !String(valeur || '').trim().startsWith('+') && <span className="indicatif">{indicatif}</span>}
        <input
          ref={champRef} type="tel" inputMode="tel" autoComplete="tel" autoFocus={autoFocus}
          placeholder={'Ex : ' + exempleTelephone(pays)} value={valeur || ''}
          onChange={(e) => surChanger(e.target.value)} onBlur={() => setVu(true)} onKeyDown={onKeyDown}
          aria-invalid={vu && n && !n.ok ? 'true' : undefined}
        />
      </span>
      {vu && n && !n.ok && <span className="tres-petit rouge-texte">{n.erreur}</span>}
      {n?.ok && <span className="tres-petit vert-texte">✓ {n.affichage}</span>}
      {aide && !(vu && n && !n.ok) && !n?.ok && <span className="tres-petit muet">{aide}</span>}
    </label>
  );
}

// Champ de saisie de montant (accepte la virgule)
export function ChampMontant({ valeur, surChanger, placeholder = '0', grand, autoFocus }) {
  return (
    <input
      className={`saisie chiffre ${grand ? 'grande' : ''}`}
      type="number"
      inputMode="decimal"
      step="any"
      min="0"
      placeholder={placeholder}
      value={valeur ?? ''}
      autoFocus={autoFocus}
      onChange={(e) => surChanger(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}
