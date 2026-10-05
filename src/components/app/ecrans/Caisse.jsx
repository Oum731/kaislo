'use client';
// ------------------------------------------------------------
// ÉCRAN CAISSE
//  - grille des produits (recherche, catégories, code-barres)
//  - panier : toujours visible à droite sur grand écran,
//    dans une fenêtre sur téléphone
// ------------------------------------------------------------
import { stockDe } from '@/lib/donnees/stock.js';
import { useEffect, useRef, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { prixDeBase } from '@/lib/donnees/vente';
import { CREDIT } from '@/lib/donnees/modeles';
import { soldeClient } from '@/lib/donnees/credit';
import { formatHeure, quantiteUnite } from '@/lib/utils/format';
import { Icone, Puces, ChampMontant, ImageStockee, Reglage, initiales } from '@/components/ui';
import { EnTete } from '../EnTete';
import { EtatCaisse } from './Ventes';
import { tr, tt } from '@/lib/i18n';

// Billets pour proposer des montants "reçus" rapides
const BILLETS = { FCFA: [500, 1000, 2000, 5000, 10000], MAD: [10, 20, 50, 100, 200] };

export default function Caisse() {
  const s = useKaislo();
  const { d } = s;
  const [recherche, setRecherche] = useState('');
  const champRecherche = useRef(null);

  // Clavier du PC : taper n'importe où écrit dans la recherche ("/" pour y aller),
  // ce qui marche aussi avec un lecteur de code-barres USB.
  useEffect(() => {
    const touche = (e) => {
      const cible = e.target;
      const dansUnChamp = ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName) || cible.isContentEditable;
      if (dansUnChamp || e.ctrlKey || e.metaKey || e.altKey || useKaislo.getState().feuille) return;
      if (e.key === '/' || (e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key))) {
        champRecherche.current?.focus();
        if (e.key === '/') e.preventDefault();
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, []);
  const [categorie, setCategorie] = useState('tout');
  const commande = s.commandeEnCours();
  const t = s.totaux();

  const r = recherche.trim().toLowerCase();
  const produits = d.produits.filter(
    (p) => p.actif && (categorie === 'tout' || p.categorieId === categorie) && (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r)
  );
  const qteDansPanier = (p) => s.panier.filter((l) => l.produitId === p.id).reduce((x, l) => x + l.quantite, 0);
  const couleur = (p) => d.categories.find((c) => c.id === p.categorieId)?.couleur || 'vert';

  const toucher = (p) => {
    if (p.groupes.length) s.ouvrir('options', { produit: p });
    else s.ajouterAuPanier(p, {}, 1);
  };

  // Un lecteur de code-barres "tape" le code puis Entrée dans la recherche
  const valider = () => {
    const p = d.produits.find((x) => x.actif && x.codeBarre && x.codeBarre === recherche.trim());
    if (p) { toucher(p); setRecherche(''); }
    else if (produits.length === 1) { toucher(produits[0]); setRecherche(''); }
  };

  return (
    <>
      <EnTete surTitre={d.commerce.nom} titre={commande ? commande.table : tr('Vendre')}>
        <button className={`bouton-rond ${s.imprimante.connectee ? 'actif' : ''}`} onClick={() => s.allerA(s.estGerant() ? 'reglages' : 'imprimante')} aria-label={tr('Imprimante')} title={s.imprimante.connectee ? tr('Imprimante connectée') : tr('Connecter l’imprimante')}>
          <Icone nom="imprimante" />
        </button>
      </EnTete>
      <div className="contenu">
        <div className="caisse">
          <div>
            {commande && (
              <div className="contexte-table">
                <Icone nom="tables" />
                <div className="grandit">
                  <b>{commande.table}</b>
                  <span className="tres-petit bloc-texte" style={{ opacity: 0.75 }}>{tr('Ouverte à {0} · {1}', [formatHeure(commande.ouverteLe), commande.vendeurNom])}</span>
                </div>
                <button className="btn secondaire petit" onClick={() => { s.quitterCommande(); s.allerA('tables'); }}>{tr('Retour aux tables')}</button>
              </div>
            )}
            <div style={{ marginBottom: 12 }}><EtatCaisse compact /></div>
            <div className="caisse-outils">
              <label className="recherche">
                <Icone nom="recherche" taille="sm" />
                <input ref={champRecherche} type="search" placeholder={tr('Rechercher un article ou un code-barres… (touche /)')} value={recherche} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && valider()} enterKeyHint="search" />
              </label>
              {s.gereStock() && (
                <button className="bouton-rond" style={{ width: 50, height: 50, borderRadius: 14 }} onClick={() => s.ouvrir('scan', { surCode: (code) => { const p = d.produits.find((x) => x.actif && x.codeBarre === code); if (p) toucher(p); else s.message(tr('Aucun produit avec le code {0}', [code]), 'erreur'); } })} aria-label={tr('Scanner un code-barres')}>
                  <Icone nom="scan" />
                </button>
              )}
            </div>
            <Puces options={[['tout', tr('Tout')], ...d.categories.map((c) => [c.id, c.nom])]} valeur={categorie} surChanger={setCategorie} />

            <div className="grille-produits">
              {produits.map((p) => {
                const q = qteDansPanier(p);
                const base = prixDeBase(p);
                const depart = base + p.groupes.filter((g) => g.obligatoire).reduce((x, g) => x + Math.min(...g.options.map((o) => o.prix)), 0);
                const texte = (
                  <>
                    <span className="tuile-nom">{p.nom}</span>
                    <span className="tuile-bas">
                      <span className="tuile-prix">
                        {base < p.prix && <s>{s.prix(p.prix)}</s>}
                        {(p.groupes.length ? tr('dès ') : '') + s.prix(depart)}
                      </span>
                      {p.suiviStock && <span className={`tuile-stock ${stockDe(p) <= (p.seuilAlerte ?? 5) ? 'bas' : ''}`}>{stockDe(p) <= 0 ? tr('Rupture') : tr('Stock {0}', [quantiteUnite(stockDe(p), p.unite)])}</span>}
                    </span>
                  </>
                );
                return (
                  <button key={p.id} className={`tuile teinte-${couleur(p)} ${p.image ? 'avec-photo' : ''} ${q ? 'dans-panier' : ''} ${p.suiviStock && stockDe(p) <= 0 ? 'rupture' : ''}`} onClick={() => toucher(p)}>
                    {q > 0 && <span className="tuile-compteur">{q}</span>}
                    {base < p.prix && <span className="badge safran tuile-promo">{tr('Promo')}</span>}
                    {p.image ? (
                      <>
                        <ImageStockee reference={p.image} className="tuile-photo" alt={p.nom} secours={<span className="tuile-photo" />} />
                        <span className="tuile-texte">{texte}</span>
                      </>
                    ) : (
                      <>
                                                {texte}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {!produits.length && d.produits.length > 0 && <div className="vide"><p>{tr('Aucun article trouvé')}</p></div>}
            {!d.produits.length && (
              <div className="vide">
                <p><b>{tr('Aucun produit pour l’instant')}</b></p>
                <p className="petit" style={{ margin: '4px 0 16px' }}>{s.peut('peutGererProduits') ? tr('Ajoutez vos premiers produits pour commencer à vendre.') : tr('Demandez au gérant d’ajouter les produits.')}</p>
                {s.peut('peutGererProduits') && <button className="btn" onClick={() => { s.allerA('produits'); s.ouvrir('produit'); }}><Icone nom="plus" /> {tr('Ajouter un produit')}</button>}
              </div>
            )}
          </div>

          {/* Grand écran : panier toujours visible */}
          <aside className="panneau-panier" aria-label={tr('Panier')}>
            <ContenuPanier />
          </aside>
        </div>
      </div>

      {/* Téléphone : barre du panier */}
      {s.panier.length > 0 && (
        <div className="barre-panier">
          <span className="nb">{t.nbArticles}</span>
          <span className="grandit">
            <span className="tres-petit bloc-texte" style={{ opacity: 0.8 }}>{commande ? commande.table : tr('Total')}</span>
            <span className="total">{s.prix(t.total)}</span>
          </span>
          <button className="btn" onClick={() => s.ouvrir('panier')}>{commande ? tr('Commande') : tr('Valider')} <Icone nom="droite" taille="sm" /></button>
        </div>
      )}
    </>
  );
}

/**
 * Contenu du panier : lignes, remise, paiement, validation.
 * Utilisé dans le panneau de droite (grand écran) et dans la fenêtre (téléphone).
 */
export function ContenuPanier({ dansFeuille = false }) {
  const s = useKaislo();
  const { d, panier } = s;
  const t = s.totaux();
  const commande = s.commandeEnCours();
  const paiement = s.paiementChoisi || d.commerce.modesPaiement[0];
  const client = s.clientCredit;
  const recu = s.montantRecu;
  const setEtat = (x) => useKaislo.setState(x);

  const suggestions = [...new Set((BILLETS[s.devise()] || []).map((b) => Math.ceil(t.total / b) * b).filter((m) => m > t.total))].sort((a, b) => a - b).slice(0, 3);
  const rendu = recu > 0 ? recu - t.total : 0;

  const encaisser = () => s.validerVente({ paiement, recu: recu || 0, client: paiement === CREDIT ? client : null });

  if (!panier.length) {
    return (
      <>
        <div className="panier-tete"><h2 className="grandit">{commande ? commande.table : tr('Commande')}</h2></div>
        <div className="panier-corps">
          <div className="vide" style={{ padding: '40px 10px' }}>
            <p><b>{tr('Panier vide')}</b></p>
            <p className="petit">{tr('Touchez un article pour l’ajouter.')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {!dansFeuille && (
        <div className="panier-tete">
          <div className="grandit">
            <h2>{commande ? commande.table : tr('Commande')}</h2>
            <p className="petit muet">{tr('{0} article{1}', [t.nbArticles, t.nbArticles > 1 ? 's' : ''])}</p>
          </div>
          {commande && commande.lignes.length ? (
            s.estGerant() && <button className="btn fantome petit" onClick={() => confirm(tr('Libérer {0} sans terminer la vente ?', [commande.table])) && s.libererTable(commande.id)}><Icone nom="poubelle" taille="sm" /> {tr('Libérer')}</button>
          ) : (
            <button className="btn fantome petit" onClick={s.viderPanier}><Icone nom="poubelle" taille="sm" /> {tr('Vider')}</button>
          )}
        </div>
      )}
      <div className={dansFeuille ? '' : 'panier-corps'}>
        <div className={dansFeuille ? 'carte' : ''} style={dansFeuille ? { padding: '4px 16px' } : undefined}>
          {panier.map((l, i) => (
            <div key={i + l.nom} className="ligne-panier">
              <div className="grandit">
                <b>{l.nom}</b>
                {l.details.map((x) => <p key={x} className="tres-petit muet">{x}</p>)}
                <p className="petit chiffre" style={{ marginTop: 2 }}>
                  <span className="muet">{s.nombre(l.prixUnitaire)} × {l.quantite} = </span><b>{s.prix(l.total)}</b>
                  {l.prixNormal && <span className="badge safran" style={{ marginLeft: 6, height: 20 }}>{tr('Promo')}</span>}
                </p>
                {l.envoyee && <span className="envoyee">{tr('✓ envoyé en cuisine')}</span>}
              </div>
              <div className="quantite">
                <button onClick={() => s.changerQuantite(i, -1)} aria-label={tr('Moins')}><Icone nom={l.quantite === 1 ? 'poubelle' : 'moins'} taille="sm" /></button>
                <span>{l.quantite}</span>
                <button onClick={() => s.changerQuantite(i, 1)} aria-label={tr('Plus')}><Icone nom="plus" taille="sm" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Remise */}
        {s.peut('peutFaireRemises') && (
          <div className="ligne espace" style={{ marginTop: 12 }}>
            {s.remise ? (
              <>
                <span className="badge safran"><Icone nom="remise" taille="sm" /> {tr('Remise {0}', [s.remise.type === 'pourcent' ? s.remise.valeur + ' %' : s.prix(s.remise.valeur)])}</span>
                <button className="lien" onClick={() => s.definirRemise(null)}>{tr('Retirer')}</button>
              </>
            ) : (
              <button className="btn fantome petit" style={{ paddingLeft: 0 }} onClick={() => s.ouvrir('remise')}><Icone nom="remise" taille="sm" /> {tr('Faire une remise')}</button>
            )}
          </div>
        )}

        {/* Client qui n'est pas sur place : le reçu lui sera envoyé par WhatsApp */}
        <div className="carte pile" style={{ marginTop: 14, padding: 14 }}>
          <Reglage
            titre={tr('Client à distance')}
            aide={tr('Livraison, commande par téléphone… Le reçu lui sera envoyé par WhatsApp.')}
            actif={s.aDistance}
            surChanger={(v) => setEtat({ aDistance: v })}
          />
          {s.aDistance && (
            <input
              className="saisie"
              type="tel"
              inputMode="tel"
              placeholder={tr('Numéro WhatsApp du client')}
              value={s.telephoneDistance}
              onChange={(e) => setEtat({ telephoneDistance: e.target.value })}
            />
          )}
        </div>

        <p className="section-titre" style={{ marginTop: 18 }}>{tr('Paiement')}</p>
        <div className="choix-grille">
          {d.commerce.modesPaiement.map((m) => (
            <button key={m} className={paiement === m ? 'actif' : ''} onClick={() => setEtat({ paiementChoisi: m })}>{tt(m)}</button>
          ))}
          <button className={`credit ${paiement === CREDIT ? 'actif' : ''}`} onClick={() => setEtat({ paiementChoisi: CREDIT })}>{tr('À crédit')}</button>
        </div>

        {paiement === 'Espèces' && (
          <div style={{ marginTop: 14 }}>
            <ChampMontant valeur={recu} surChanger={(v) => setEtat({ montantRecu: v })} placeholder={tr('Montant reçu (facultatif)')} />
            <div className="puces" style={{ marginTop: 8 }}>
              <button className="puce" onClick={() => setEtat({ montantRecu: t.total })}>{tr('Compte exact')}</button>
              {suggestions.map((m) => <button key={m} className={`puce ${recu === m ? 'actif' : ''}`} onClick={() => setEtat({ montantRecu: m })}>{s.nombre(m)}</button>)}
            </div>
            {recu > 0 && (
              <div className={rendu >= 0 ? 'info-verte ligne espace' : 'alerte ligne espace'} style={{ marginTop: 10 }}>
                <span>{rendu >= 0 ? tr('À rendre au client') : tr('Montant insuffisant')}</span>
                <span className="chiffre">{s.prix(Math.abs(rendu))}</span>
              </div>
            )}
          </div>
        )}

        {paiement === CREDIT && (
          <div style={{ marginTop: 14 }}>
            {client ? (
              <div className="carte ligne" style={{ padding: 12 }}>
                <span className="avatar gerant">{initiales(client.nom)}</span>
                <span className="grandit">
                  <b className="bloc-texte tronque">{client.nom}</b>
                  <span className="tres-petit muet">{tr('Doit déjà {0}', [s.prix(soldeClient(d, client.id))])}</span>
                </span>
                <button className="lien" onClick={() => s.ouvrir('choixClient')}>{tr('Changer')}</button>
              </div>
            ) : (
              <button className="btn safran bloc" onClick={() => s.ouvrir('choixClient')}><Icone nom="carnet" /> {tr('Choisir le client')}</button>
            )}
          </div>
        )}
      </div>

      <div className={dansFeuille ? '' : 'panier-pied'} style={dansFeuille ? { marginTop: 18 } : undefined}>
        <div className="lignes-totaux">
          {t.remise > 0 && (
            <>
              <div><span className="muet">{tr('Sous-total')}</span><span className="chiffre">{s.prix(t.sousTotal)}</span></div>
              <div><span className="muet">{tr('Remise')}</span><span className="chiffre rouge-texte">−{s.prix(t.remise)}</span></div>
            </>
          )}
        </div>
        <div className="ligne espace" style={{ margin: '4px 0 12px' }}>
          <span className="muet">{tr('Total à payer')}</span>
          <span className="total-grand">{s.prix(t.total)}</span>
        </div>
        {(commande || s.aTables()) && (
          <button className="btn secondaire bloc" style={{ marginBottom: 8 }} onClick={() => (commande ? s.envoyerEnCuisine() : s.ouvrir('choixTable'))}>
            <Icone nom="cuisine" /> {commande ? tr('Envoyer en cuisine') : tr('Mettre sur une table')}
          </button>
        )}
        <button className="btn grand bloc" onClick={encaisser} disabled={paiement === CREDIT && !client}>
          <Icone nom={s.imprimante.connectee ? 'imprimante' : 'ok'} />
          {paiement === CREDIT ? tr('Noter à crédit') : s.imprimante.connectee ? tr('Valider et imprimer') : tr('Valider la vente')}
        </button>
      </div>
    </>
  );
}
