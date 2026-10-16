'use client';
// ------------------------------------------------------------
// RESTAURATION ET RÈGLES LOCALES : dans les pays où les restaurants, cafés et bars ont des obligations particulières
// (caisse enregistreuse certifiée, TVA, hygiène…), Kaislo rappelle clairement qu'il est un outil de gestion.
//   <ConfirmationRestauration>  case à cocher obligatoire à l'inscription ou à l'ajout d'un commerce
//   <RappelRestauration>        rappel permanent sur l'écran des tables
// Les règles par pays : champ « restauration » de api/lib/pays.json (voir lib/donnees/restauration.js).
// ------------------------------------------------------------
import { Icone } from '@/components/ui';
import { reglementRestauration } from '@/lib/donnees/restauration';
import { paysParId } from '@/lib/donnees/modeles';
import { chemin } from '@/config';
import { tr } from '@/lib/i18n';

const LIEN = '/conditions-utilisation/#contenus-et-reglementation';

export function ConfirmationRestauration({ pays, type, accepte, surChanger }) {
  if (reglementRestauration(pays, type) !== 'avis') return null;
  return (
    <div className="avis-restauration">
      <p className="avis-titre"><Icone nom="alerte" />{tr('Restaurant, café ou bar : {0}', [paysParId(pays).nom])}</p>
      <p className="petit">{tr('Dans ce pays, les restaurants et cafés peuvent devoir utiliser une caisse enregistreuse certifiée et respecter des règles précises (TVA, hygiène, alcool). Kaislo est un outil de gestion : ce n’est pas une caisse certifiée, et il ne vérifie pas que votre activité respecte ces règles.')}</p>
      <label className="case-accord">
        <input type="checkbox" checked={accepte} onChange={(e) => surChanger(e.target.checked)} />
        <span>{tr('Je comprends que je suis seul responsable du respect des règles de mon pays et de tout ce que je publie (articles, photos, prix). Kaislo n’en est en aucun cas responsable.')} <a href={chemin(LIEN)} target="_blank" rel="noreferrer">{tr('En savoir plus')}</a></span>
      </label>
    </div>
  );
}

export function RappelRestauration({ pays, type }) {
  if (reglementRestauration(pays, type) !== 'avis') return null;
  return (
    <div className="avis-restauration compact">
      <Icone nom="bouclier" />
      <p className="petit">{tr('Kaislo est un outil de gestion, pas une caisse certifiée. Vous restez responsable du respect des règles de votre pays et de ce que vous publiez.')} <a href={chemin(LIEN)} target="_blank" rel="noreferrer">{tr('En savoir plus')}</a></p>
    </div>
  );
}
