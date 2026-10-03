'use client';
// ------------------------------------------------------------
// STRUCTURE de l'application connectée :
//  - menu (en bas sur téléphone, à gauche sur tablette/ordinateur)
//  - l'écran choisi
//  - la fenêtre ouverte (s'il y en a une)
// Le menu dépend du rôle et des droits de la personne connectée.
// ------------------------------------------------------------
import { useKaislo } from '@/store/kaislo';
import { Icone, Avatar } from '@/components/ui';
import Accueil from './ecrans/Accueil';
import Caisse from './ecrans/Caisse';
import Tables from './ecrans/Tables';
import Ventes from './ecrans/Ventes';
import Clients from './ecrans/Clients';
import Produits from './ecrans/Produits';
import Stock from './ecrans/Stock';
import Aide from './ecrans/Aide';
import Reglages, { BlocImprimante } from './ecrans/Reglages';
import Feuilles from './feuilles/Feuilles';
import { EnTete } from './EnTete';
import Marque from '@/components/Marque';

// Liste des liens du menu : [écran, libellé, icône, pastille]
export function liensMenu(s) {
  const gerant = s.estGerant();
  const liens = [];
  if (gerant) liens.push(['accueil', 'Accueil', 'accueil']);
  liens.push(['caisse', 'Caisse', 'caisse']);
  if (s.aTables()) liens.push(['tables', 'Tables', 'tables', (s.d.commandes || []).filter((c) => c.lignes.length).length || null]);
  liens.push(['ventes', gerant ? 'Ventes' : 'Mes ventes', 'ventes']);
  liens.push(['clients', 'Crédit', 'carnet']);
  if (s.peut('peutGererProduits')) liens.push(['produits', 'Produits', 'produits']);
  if (s.gereStock() && s.peut('peutGererProduits')) liens.push(['stock', 'Stock', 'stock']);
  liens.push(gerant ? ['reglages', 'Réglages', 'reglages'] : ['imprimante', 'Imprimante', 'imprimante']);
  // Aide et messagerie avec l'équipe Kaislo (pastille : réponses pas encore lues)
  liens.push(['aide', 'Aide', 'whatsapp', s.messagesNonLus || null]);
  return liens;
}

const ECRANS = { accueil: Accueil, caisse: Caisse, tables: Tables, ventes: Ventes, clients: Clients, produits: Produits, stock: Stock, reglages: Reglages, imprimante: EcranImprimante, aide: Aide };

export default function Coque() {
  const s = useKaislo();
  const liens = liensMenu(s);
  // Sur téléphone : 4 liens + "Plus" s'il y en a trop
  const tropDeLiens = liens.length > 5;
  const Ecran = ECRANS[s.ecran] || Caisse;

  return (
    <div className="coque">
      <nav className="menu" aria-label="Menu principal">
        <div className="menu-marque">
          <span className="logo"><Marque /><span className="logo-texte">Kaislo</span></span>
        </div>
        <div className="menu-liens">
          {liens.map(([ecran, libelle, icone, pastille], i) => (
            <button
              key={ecran}
              className={`menu-lien ${s.ecran === ecran ? 'actif' : ''} ${tropDeLiens && i >= 4 ? 'cache-mobile' : ''}`}
              onClick={() => s.allerA(ecran)}
              aria-current={s.ecran === ecran ? 'page' : undefined}
            >
              <Icone nom={icone} />
              <span className="tronque">{libelle}</span>
              {pastille ? <span className="pastille-nb">{pastille}</span> : null}
            </button>
          ))}
          {tropDeLiens && (
            <button className={`menu-lien seulement-mobile ${liens.slice(4).some(([e]) => e === s.ecran) ? 'actif' : ''}`} onClick={() => s.ouvrir('menu')}>
              <Icone nom="menu" />
              <span>Plus</span>
            </button>
          )}
        </div>
        <div className="menu-pied">
          <button className="carte-utilisateur" onClick={() => s.ouvrir('compte')}>
            <Avatar nom={s.utilisateur.nom} gerant={s.estGerant()} />
            <span className="infos">
              <b className="bloc-texte tronque">{s.utilisateur.nom}</b>
              <span className="tres-petit tronque bloc-texte" style={{ opacity: 0.65 }}>{s.d.commerce.nom}</span>
            </span>
          </button>
        </div>
      </nav>
      <main className="principal">
        <Ecran />
      </main>
      <Feuilles />
    </div>
  );
}

// Onglet "Imprimante" du vendeur
function EcranImprimante() {
  const d = useKaislo((s) => s.d);
  return (
    <>
      <EnTete surTitre={d.commerce.nom} titre="Imprimante" />
      <div className="contenu" style={{ maxWidth: 760 }}>
        <BlocImprimante />
      </div>
    </>
  );
}
