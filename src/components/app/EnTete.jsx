'use client';
// En-tête des écrans : sur-titre, titre, boutons à droite, avatar (téléphone)
import { useKaisly } from '@/store/kaisly';
import { Avatar, ImageStockee } from '@/components/ui';

export function EnTete({ surTitre, titre, children, avecLogo = false }) {
  const s = useKaisly();
  return (
    <header className="barre-haut">
      {avecLogo && <ImageStockee reference={s.d.commerce.logo} className="logo-commerce" alt={'Logo ' + s.d.commerce.nom} />}
      <div className="titres">
        {surTitre && <p className="sur-titre">{surTitre}</p>}
        <h1>{titre}</h1>
      </div>
      {children}
      <span className="seulement-mobile">
        <Avatar nom={s.utilisateur.nom} gerant={s.estGerant()} onClick={() => s.ouvrir('compte')} />
      </span>
    </header>
  );
}
