'use client';
// ------------------------------------------------------------
// ÉCRAN PRODUITS : articles par catégorie (prix, promo, marge),
// et catégories (gérant). Les vendeurs autorisés peuvent ajouter
// et modifier des articles, mais pas les supprimer.
// ------------------------------------------------------------
import { stockDe } from '@/lib/donnees/stock.js';
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Icone, Segment, Interrupteur, ImageStockee, initiales } from '@/components/ui';
import { EnTete } from '../EnTete';
import { tr } from '@/lib/i18n';

export default function Produits() {
  const s = useKaislo();
  const { d } = s;
  const [onglet, setOnglet] = useState('articles');
  const [recherche, setRecherche] = useState('');
  const r = recherche.trim().toLowerCase();

  return (
    <>
      <EnTete surTitre={tr('{0} articles · {1} catégories', [d.produits.length, d.categories.length])} titre={tr('Produits')}>
        <button className="btn cache-mobile" onClick={() => (onglet === 'articles' ? s.ouvrir('produit') : s.ouvrir('categorie'))}>
          <Icone nom="plus" /> {onglet === 'articles' ? tr('Nouvel article') : tr('Nouvelle catégorie')}
        </button>
      </EnTete>
      <div className="contenu" style={{ maxWidth: 980 }}>
        {s.peut('peutGererProduits') && (
          <div style={{ maxWidth: 420, marginBottom: 14 }}>
            <Segment options={[['articles', tr('Articles')], ['categories', tr('Catégories')]]} valeur={onglet} surChanger={setOnglet} />
          </div>
        )}

        {onglet === 'articles' && (
          <>
            <label className="recherche">
              <Icone nom="recherche" taille="sm" />
              <input type="search" placeholder={tr('Rechercher un article ou un code-barres…')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </label>
            {d.categories.map((c) => {
              const liste = d.produits.filter((p) => p.categorieId === c.id && (!r || p.nom.toLowerCase().includes(r) || p.codeBarre === r));
              if (r && !liste.length) return null;
              return (
                <div key={c.id}>
                  <div className="entete-section">
                    <p className="section-titre">{c.nom}</p>
                    <button className="lien" onClick={() => s.ouvrir('produit', { categorieId: c.id })}>{tr('+ Ajouter')}</button>
                  </div>
                  <div className={`liste teinte-${c.couleur}`}>
                    {liste.map((p) => {
                      const prixVente = p.promo !== null && p.promo !== undefined && p.promo < p.prix ? p.promo : p.prix;
                      const marge = p.prixAchat > 0 && prixVente > 0 ? Math.round(((prixVente - p.prixAchat) / prixVente) * 100) : null;
                      return (
                        <div key={p.id} className={`liste-item cliquable ${p.actif ? '' : 'inactif'}`} onClick={() => s.ouvrir('produit', { produit: p })}>
                          <ImageStockee reference={p.image} className="mini-photo" alt="" secours={<span className="mini-emoji">{initiales(p.nom)}</span>} />
                          <span className="grandit">
                            <span className="ligne" style={{ gap: 6 }}>
                              <b className="tronque">{p.nom}</b>
                              {prixVente < p.prix && <span className="badge safran">{tr('Promo')}</span>}
                            </span>
                            <span className="tres-petit muet tronque bloc-texte">
                              {prixVente < p.prix ? <><s>{s.prix(p.prix)}</s> {s.prix(prixVente)}</> : s.prix(p.prix)}
                              {marge !== null && ` · ${tr('marge {0} %', [marge])}`}
                              {p.groupes.length > 0 && ' · ' + p.groupes.map((g) => g.nom).join(', ')}
                              {p.suiviStock && ' · ' + tr('stock {0}', [stockDe(p)])}
                            </span>
                          </span>
                          <span onClick={(e) => e.stopPropagation()}>
                            <Interrupteur actif={p.actif} surChanger={() => s.basculerProduit(p.id)} label={p.actif ? tr('Masquer de la vente') : tr('Afficher à la vente')} />
                          </span>
                        </div>
                      );
                    })}
                    {!liste.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucun article dans cette catégorie.')}</p>}
                  </div>
                </div>
              );
            })}
            <p className="tres-petit muet centre" style={{ marginTop: 18 }}>{tr('L’interrupteur masque un article de l’écran de vente sans le supprimer.')}</p>
            <button className="bouton-flottant seulement-mobile" onClick={() => s.ouvrir('produit')}><Icone nom="plus" /> {tr('Article')}</button>
          </>
        )}

        {onglet === 'categories' && (
          <>
            <div className="liste">
              {d.categories.map((c, i) => (
                <div key={c.id} className={`liste-item teinte-${c.couleur}`}>
                  <span className="mini-emoji">{c.nom.charAt(0)}</span>
                  <button className="grandit" style={{ textAlign: 'left' }} onClick={() => s.ouvrir('categorie', { categorie: c })}>
                    <b className="bloc-texte">{c.nom}</b>
                    <span className="tres-petit muet">{tr('{0} articles', [d.produits.filter((p) => p.categorieId === c.id).length])}</span>
                  </button>
                  <button className="icone-btn" onClick={() => s.deplacerCategorie(c.id, -1)} disabled={i === 0} aria-label={tr('Monter')}><Icone nom="haut" taille="sm" /></button>
                  <button className="icone-btn" onClick={() => s.deplacerCategorie(c.id, 1)} disabled={i === d.categories.length - 1} aria-label={tr('Descendre')}><Icone nom="bas" taille="sm" /></button>
                </div>
              ))}
            </div>
            <p className="tres-petit muet centre" style={{ marginTop: 18 }}>{tr('L’ordre des catégories est celui de l’écran de vente.{0}', [!s.estGerant() && tr(' Seul le gérant peut supprimer une catégorie.')])}</p>
            <button className="bouton-flottant seulement-mobile" onClick={() => s.ouvrir('categorie')}><Icone nom="plus" /> {tr('Catégorie')}</button>
          </>
        )}
      </div>
    </>
  );
}
