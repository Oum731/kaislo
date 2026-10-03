'use client';
// En-tête des écrans : sur-titre, titre, boutons à droite, avatar (téléphone)
import { useKaisly } from '@/store/kaisly';
import { Avatar, ImageStockee } from '@/components/ui';
import { estServeur } from '@/lib/donnees/synchro';

// Petit indicateur de sauvegarde en ligne (commerces inscrits) : touché, il ouvre le détail dans « Mon compte »
function PastilleSynchro() {
  const s = useKaisly();
  if (!estServeur(s.d)) return null;
  const { etat, enAttente } = s.synchro;
  const [classe, texte] = etat === 'hors-ligne' ? ['hors-ligne', 'Hors ligne' + (enAttente ? ' · ' + enAttente : '')]
    : etat === 'erreur' ? ['erreur', 'Non synchronisé']
    : etat === 'envoi' || enAttente ? ['attente', 'Envoi…']
    : ['ok', 'À jour'];
  return (
    <button className={'pastille-synchro ' + classe} onClick={() => s.ouvrir('compte')} title="Sauvegarde en ligne">
      <span className="point" />{texte}
    </button>
  );
}

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
      <PastilleSynchro />
      <span className="seulement-mobile">
        <Avatar nom={s.utilisateur.nom} gerant={s.estGerant()} onClick={() => s.ouvrir('compte')} />
      </span>
    </header>
  );
}
