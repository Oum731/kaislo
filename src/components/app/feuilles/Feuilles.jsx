'use client';
// ------------------------------------------------------------
// Affiche la fenêtre demandée par s.ouvrir('type', infos)
// ------------------------------------------------------------
import { useKaislo } from '@/store/kaislo';
import {
  FeuilleOptions, FeuillePanier, FeuilleTicket, FeuilleAnnulation, FeuilleCuisine, FeuilleRemise,
  FeuilleChoixClient, FeuilleChoixTable, FeuilleScan, FeuilleCloture, FeuilleTicketCloture, FeuilleOuverture,
} from './FeuillesVente';
import {
  FeuilleProduit, FeuilleCategorie, FeuilleUtilisateur, FeuilleDepense, FeuilleClient, FeuilleFicheClient,
  FeuilleRemboursement, FeuilleRecuRemboursement, FeuilleEntreeStock, FeuilleAjustement, FeuilleCompte, FeuilleMenu, FeuilleBiometrie,
} from './FeuillesGestion';

import { FeuilleRapport } from './FeuilleRapport';
import { FeuilleCommerces, FeuilleAjoutCommerce } from './FeuillesCommerces';

const FEUILLES = {
  rapport: FeuilleRapport,
  options: FeuilleOptions,
  panier: FeuillePanier,
  ticket: FeuilleTicket,
  annulation: FeuilleAnnulation,
  cuisine: FeuilleCuisine,
  remise: FeuilleRemise,
  choixClient: FeuilleChoixClient,
  choixTable: FeuilleChoixTable,
  scan: FeuilleScan,
  ouverture: FeuilleOuverture,
  cloture: FeuilleCloture,
  ticketCloture: FeuilleTicketCloture,
  produit: FeuilleProduit,
  categorie: FeuilleCategorie,
  utilisateur: FeuilleUtilisateur,
  depense: FeuilleDepense,
  client: FeuilleClient,
  ficheClient: FeuilleFicheClient,
  remboursement: FeuilleRemboursement,
  recuRemboursement: FeuilleRecuRemboursement,
  entreeStock: FeuilleEntreeStock,
  ajustement: FeuilleAjustement,
  compte: FeuilleCompte,
  menu: FeuilleMenu,
  biometrie: FeuilleBiometrie,
  commerces: FeuilleCommerces,
  ajoutCommerce: FeuilleAjoutCommerce,
};

export default function Feuilles() {
  const feuille = useKaislo((s) => s.feuille);
  if (!feuille) return null;
  const Composant = FEUILLES[feuille.type];
  if (!Composant) return null;
  const { type, _id, ...infos } = feuille;
  // "key" : une nouvelle fenêtre repart de zéro (formulaires vidés)
  return <Composant key={_id} {...infos} />;
}
