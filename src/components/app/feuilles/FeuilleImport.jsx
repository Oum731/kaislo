'use client';
// ------------------------------------------------------------
// IMPORT D'ARTICLES depuis Excel ou CSV : 1) choisir le fichier  2) vérifier  3) importer.
// La logique (colonnes, nombres, erreurs) est dans lib/donnees/import-produits.js ; l'enregistrement dans le store (importerArticles).
// ------------------------------------------------------------
import { useRef, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone, Reglage } from '@/components/ui';
import { analyserImport } from '@/lib/donnees/import-produits';
import { typeCommerce } from '@/lib/donnees/modeles';
import { livrerFichier, MIME_XLSX } from '@/lib/export/livrer';
import { tr } from '@/lib/i18n';

// Valeurs d'exemple du modèle, adaptées à la monnaie du commerce (1 = franc CFA)
const ECHELLE = { FCFA: 1, GNF: 14, MAD: 1 / 60, EUR: 1 / 655, CAD: 1 / 450, USD: 1 / 600 };
const exemple = (valeurFcfa, devise) => {
  const x = valeurFcfa * (ECHELLE[devise] ?? 1);
  return x >= 100 ? Math.round(x / 50) * 50 : Math.max(0.5, Math.round(x * 2) / 2);
};

const RAISONS = () => ({
  nom: tr('Nom manquant'),
  nomLong: tr('Nom trop long'),
  prix: tr('Prix manquant ou illisible'),
  prixNegatif: tr('Prix négatif'),
  doublon: tr('Déjà dans le fichier'),
});

const MESSAGES_FICHIER = () => ({
  'trop-gros': tr('Fichier trop gros (5 Mo au maximum).'),
  format: tr('Choisissez un fichier Excel (.xlsx) ou CSV. Pour un ancien fichier .xls, enregistrez-le d’abord en .xlsx.'),
  vide: tr('Ce fichier est vide.'),
  illisible: tr('Impossible de lire ce fichier. Enregistrez-le de nouveau en .xlsx ou en .csv.'),
});

export function FeuilleImport() {
  const s = useKaislo();
  const { d } = s;
  const champ = useRef(null);
  const [etat, setEtat] = useState('choix'); // choix | analyse | fait
  const [analyse, setAnalyse] = useState(null);
  const [nomFichier, setNomFichier] = useState('');
  const [erreur, setErreur] = useState('');
  const [majExistants, setMajExistants] = useState(false);
  const [bilan, setBilan] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const unite = typeCommerce(d.commerce.type).unite;

  const lire = async (fichier) => {
    if (!fichier) return;
    setErreur('');
    setOccupe(true);
    try {
      const { lireTableur } = await import('@/lib/import/lire-tableur');
      const lignes = await lireTableur(fichier);
      const r = analyserImport(lignes, d.produits, unite);
      if (r.erreur) { setErreur(tr('Colonnes « Nom » et « Prix » introuvables. Utilisez le modèle ci-dessous ou donnez ces titres à vos colonnes.')); return; }
      if (!r.articles.length && !r.erreurs.length) { setErreur(MESSAGES_FICHIER().vide); return; }
      setNomFichier(fichier.name);
      setAnalyse(r);
      setEtat('analyse');
    } catch (e) {
      setErreur(MESSAGES_FICHIER()[e.code] || MESSAGES_FICHIER().illisible);
    } finally {
      setOccupe(false);
      if (champ.current) champ.current.value = '';
    }
  };

  const modele = async () => {
    setOccupe(true);
    try {
      const { octetsModeleImport } = await import('@/lib/import/lire-tableur');
      const dev = d.commerce.devise;
      const octets = await octetsModeleImport({
        feuille: tr('Articles'),
        feuilleAide: tr('Aide'),
        colonnes: [
          { cle: 'nom', titre: tr('Nom'), largeur: 30 }, { cle: 'prix', titre: tr('Prix de vente'), largeur: 16 }, { cle: 'achat', titre: tr('Prix d’achat'), largeur: 16 },
          { cle: 'cat', titre: tr('Catégorie'), largeur: 20 }, { cle: 'stock', titre: tr('Stock'), largeur: 10 }, { cle: 'unite', titre: tr('Unité'), largeur: 12 },
          { cle: 'code', titre: tr('Code-barres'), largeur: 18 }, { cle: 'seuil', titre: tr('Seuil d’alerte'), largeur: 14 }, { cle: 'promo', titre: tr('Prix promo'), largeur: 14 },
        ],
        exemples: [
          [tr('Exemple : Riz 5 kg'), exemple(5000, dev), exemple(4200, dev), tr('Épicerie'), 24, tr('sac'), '6111252421012', 5, ''],
          [tr('Exemple : Eau 1,5 L'), exemple(500, dev), exemple(350, dev), tr('Boissons'), 60, tr('bouteille'), '', 12, ''],
          [tr('Exemple : Plat du jour'), exemple(2500, dev), '', tr('Plats'), '', unite, '', '', exemple(2000, dev)],
        ],
        aide: [
          tr('Comment remplir ce fichier'),
          tr('1. Gardez la première ligne (les titres). Supprimez les 3 lignes d’exemple et écrivez vos articles.'),
          tr('2. Obligatoire : « Nom » et « Prix de vente ». Le reste est facultatif.'),
          tr('3. « Stock » : si vous l’indiquez, Kaislo suit le stock de cet article. Sinon, laissez vide.'),
          tr('4. « Catégorie » : elle est créée automatiquement si elle n’existe pas encore.'),
          tr('5. Écrivez les prix en chiffres, sans le nom de la monnaie (ou avec, ce n’est pas grave).'),
          tr('6. Jusqu’à 2 000 articles à la fois. Les photos s’ajoutent ensuite, article par article.'),
        ],
      });
      await livrerFichier(octets, 'kaislo-modele-import-articles.xlsx', MIME_XLSX);
    } catch (e) {
      console.error(e);
      s.message(tr('Impossible de créer le modèle'), 'erreur');
    } finally {
      setOccupe(false);
    }
  };

  const aImporter = analyse ? analyse.articles.filter((a) => a.etat === 'nouveau' || majExistants) : [];
  const nbNouveaux = analyse ? analyse.articles.filter((a) => a.etat === 'nouveau').length : 0;
  const nbExistants = analyse ? analyse.articles.filter((a) => a.etat === 'existant').length : 0;
  const raisons = RAISONS();

  const importer = () => {
    const r = s.importerArticles(analyse.articles, { miseAJour: majExistants });
    if (r.erreur) return setErreur(r.erreur);
    setBilan(r);
    setEtat('fait');
  };

  // ---------- 3. Terminé ----------
  if (etat === 'fait') {
    return (
      <Feuille titre={tr('Import terminé')} surFermer={s.fermer} pied={<div className="pile"><button className="btn bloc" onClick={() => { s.fermer(); s.allerA('produits'); }}>{tr('Voir mes articles')}</button></div>}>
        <div className="import-fin">
          <span className="import-fin-icone"><Icone nom="ok" /></span>
          <p className="import-fin-nombre">{bilan.crees + bilan.misAJour > 1 ? tr('{0} articles importés', [bilan.crees + bilan.misAJour]) : tr('1 article importé')}</p>
          <div className="import-puces">
            {bilan.crees > 0 && <span className="badge">{tr('{0} nouveaux', [bilan.crees])}</span>}
            {bilan.misAJour > 0 && <span className="badge safran">{tr('{0} mis à jour', [bilan.misAJour])}</span>}
            {bilan.categoriesCreees > 0 && <span className="badge">{bilan.categoriesCreees > 1 ? tr('{0} catégories créées', [bilan.categoriesCreees]) : tr('1 catégorie créée')}</span>}
          </div>
          <p className="petit muet">{tr('Ajoutez maintenant les photos depuis la fiche de chaque article.')}</p>
        </div>
      </Feuille>
    );
  }

  // ---------- 2. Vérification ----------
  if (etat === 'analyse') {
    return (
      <Feuille titre={tr('Vérifiez avant d’importer')} sousTitre={nomFichier} surFermer={s.fermer} pleine
        pied={
          <div className="pile">
            <button className="btn grand bloc" onClick={importer} disabled={!aImporter.length}>
              <Icone nom="installer" /> {aImporter.length > 1 ? tr('Importer {0} articles', [aImporter.length]) : aImporter.length ? tr('Importer 1 article') : tr('Rien à importer')}
            </button>
            <button className="btn fantome bloc" onClick={() => { setEtat('choix'); setAnalyse(null); }}>{tr('Choisir un autre fichier')}</button>
          </div>
        }>
        <div className="pile">
          <div className="import-puces gros">
            <span className="import-compte vert"><Icone nom="ok" /><b>{nbNouveaux}</b>{tr('nouveaux')}</span>
            {nbExistants > 0 && <span className="import-compte safran"><Icone nom="horloge" /><b>{nbExistants}</b>{tr('déjà présents')}</span>}
            {analyse.erreurs.length > 0 && <span className="import-compte rouge"><Icone nom="alerte" /><b>{analyse.erreurs.length}</b>{tr('à corriger')}</span>}
          </div>

          {analyse.trop && <p className="alerte">{tr('Seuls les 2 000 premiers articles sont lus. Importez le reste dans un second fichier.')}</p>}
          {erreur && <p className="alerte">{erreur}</p>}

          {nbExistants > 0 && (
            <div className="carte" style={{ padding: 14 }}>
              <Reglage titre={tr('Mettre à jour les articles déjà présents')} aide={tr('Prix, prix d’achat, stock… sinon ils sont laissés tels quels.')} actif={majExistants} surChanger={setMajExistants} />
            </div>
          )}

          <div>
            <p className="section-titre">{tr('Aperçu')}</p>
            <div className="import-liste">
              {analyse.articles.slice(0, 8).map((a) => (
                <div key={a.ligne} className={'import-ligne ' + (a.etat === 'existant' ? 'existant' : '')}>
                  <span className="grandit"><b className="tronque bloc-texte">{a.nom}</b><span className="tres-petit muet">{[a.categorie, a.stock !== null && tr('stock {0}', [a.stock])].filter(Boolean).join(' · ')}</span></span>
                  {a.etat === 'existant' && <span className="badge safran">{majExistants ? tr('mis à jour') : tr('ignoré')}</span>}
                  <b className="chiffre">{s.prix(a.prix)}</b>
                </div>
              ))}
              {analyse.articles.length > 8 && <p className="tres-petit muet centre" style={{ padding: 8 }}>{tr('et {0} autres…', [analyse.articles.length - 8])}</p>}
            </div>
          </div>

          {analyse.erreurs.length > 0 && (
            <div>
              <p className="section-titre">{tr('Lignes ignorées')}</p>
              <div className="import-liste">
                {analyse.erreurs.slice(0, 10).map((e) => (
                  <div key={e.ligne} className="import-ligne erreur">
                    <span className="grandit"><b className="tronque bloc-texte">{e.nom || tr('(sans nom)')}</b><span className="tres-petit">{tr('Ligne {0}', [e.ligne])}</span></span>
                    <span className="badge rouge">{raisons[e.raison]}</span>
                  </div>
                ))}
                {analyse.erreurs.length > 10 && <p className="tres-petit muet centre" style={{ padding: 8 }}>{tr('et {0} autres…', [analyse.erreurs.length - 10])}</p>}
              </div>
            </div>
          )}

          {analyse.inconnues.length > 0 && <p className="tres-petit muet">{tr('Colonnes non utilisées : {0}', [analyse.inconnues.slice(0, 6).join(', ')])}</p>}
        </div>
      </Feuille>
    );
  }

  // ---------- 1. Choix du fichier ----------
  return (
    <Feuille titre={tr('Importer des articles')} sousTitre={tr('Depuis Excel ou CSV')} surFermer={s.fermer}>
      <div className="pile">
        <input ref={champ} type="file" accept=".xlsx,.csv,.txt,.tsv" hidden onChange={(e) => lire(e.target.files?.[0])} />
        <button className="import-zone" onClick={() => champ.current?.click()} disabled={occupe}>
          <span className="import-zone-icone"><Icone nom="carnet" /></span>
          <b>{occupe ? tr('Lecture du fichier…') : tr('Choisir un fichier')}</b>
          <span className="petit muet">.xlsx · .csv</span>
        </button>
        {erreur && <p className="alerte">{erreur}</p>}
        <button className="btn secondaire bloc" onClick={modele} disabled={occupe}><Icone nom="installer" /> {tr('Télécharger le modèle Excel')}</button>
        <div className="import-colonnes" aria-label={tr('Colonnes')}>
          {[tr('Nom'), tr('Prix de vente'), tr('Prix d’achat'), tr('Catégorie'), tr('Stock')].map((c, i) => <span key={c} className={'badge ' + (i < 2 ? '' : 'gris')}>{c}{i < 2 ? ' *' : ''}</span>)}
        </div>
      </div>
    </Feuille>
  );
}
