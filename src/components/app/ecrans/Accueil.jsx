'use client';
// ------------------------------------------------------------
// TABLEAU DE BORD du gérant : chiffre d'affaires, marge, dépenses,
// crédit en cours, graphique, alertes de stock, classements.
// ------------------------------------------------------------
import { stockDe } from '@/lib/donnees/stock.js';
import { useMemo, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { calculerStats, LIBELLES_PERIODE } from '@/lib/donnees/statistiques';
import { totalCreditEnCours } from '@/lib/donnees/credit';
import { historiqueCaisse } from '@/lib/donnees/cloture';
import { formatJourLong, formatDate, formatHeure } from '@/lib/utils/format';
import { Icone, Segment } from '@/components/ui';
import { EnTete } from '../EnTete';
import { etatAbonnement } from '@/lib/donnees/abonnement';
import { CONTACT_WHATSAPP } from '@/config';

export default function Accueil() {
  const s = useKaislo();
  const { d } = s;
  const [periode, setPeriode] = useState(() => {
    // Tôt le matin, aucune vente aujourd'hui : on montre la semaine
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    return d.ventes.some((v) => new Date(v.date) >= debut) || !d.ventes.length ? 'jour' : 'semaine';
  });
  const [barre, setBarre] = useState(null);
  const st = useMemo(() => calculerStats(d.ventes, periode, new Date(), d.depenses || []), [d.ventes, d.depenses, periode]);
  const credit = useMemo(() => totalCreditEnCours(d), [d]);
  const journees = historiqueCaisse(d).slice(0, 5);
  const stockBas = d.produits.filter((p) => p.actif && p.suiviStock && stockDe(p) <= (p.seuilAlerte ?? 5)).sort((a, b) => stockDe(a) - stockDe(b));
  const max = Math.max(1, ...st.barres.map((b) => b.valeur));
  const n = st.barres.length;
  const etiquette = (i) => (n > 20 ? i === 0 || (i + 1) % 5 === 0 : n > 12 ? i % 2 === 0 : true);
  const lib = LIBELLES_PERIODE[periode];
  const prenom = s.utilisateur.nom.split(' ')[0];

  return (
    <>
      <EnTete surTitre={formatJourLong(new Date()) + ' · ' + d.commerce.nom} titre={'Bonjour, ' + prenom} avecLogo />
      <div className="contenu">
        <BandeauAbonnement />
        <PremiersPas />
        <div style={{ maxWidth: 520 }}>
          <Segment options={[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']]} valeur={periode} surChanger={(p) => { setPeriode(p); setBarre(null); }} />
        </div>

        <div className="grille-ecran deux" style={{ marginTop: 16 }}>
          {/* Colonne principale */}
          <div className="pile">
            <div className="carte kpi-principal">
              <p className="petit" style={{ opacity: 0.8 }}>Chiffre d’affaires · {lib.titre}</p>
              <p className="valeur">{s.prix(st.total)}</p>
              {st.variation !== null && (
                <span className="evolution" style={st.variation < 0 ? { color: 'var(--rouge)', background: 'var(--rouge-clair)' } : undefined}>
                  <Icone nom={st.variation >= 0 ? 'hausse' : 'baisse'} taille="sm" />
                  {(st.variation >= 0 ? '+' : '') + st.variation} % vs {lib.prec}
                </span>
              )}
            </div>
            <div className="kpis">
              <div className="carte kpi"><p className="petit muet">Tickets</p><p className="kpi-valeur">{st.nb}</p><p className="sous">Panier moyen {s.prix(st.panierMoyen)}</p></div>
              <div className="carte kpi">
                <p className="petit muet">Marge brute</p>
                <p className="kpi-valeur vert-texte">{st.marge !== null ? s.prix(st.marge) : '—'}</p>
                <p className="sous">{st.tauxMarge !== null ? st.tauxMarge + ' % des ventes' : 'Ajoutez les prix d’achat'}</p>
              </div>
              <div className="carte kpi"><p className="petit muet">Dépenses</p><p className="kpi-valeur rouge-texte">{s.prix(st.totalDepenses)}</p><p className="sous">Solde {s.prix(st.solde)}</p></div>
              <button className="carte kpi" onClick={() => s.allerA('clients')}>
                <p className="petit muet">Crédit en cours</p><p className="kpi-valeur" style={{ color: 'var(--safran-fonce)' }}>{s.prix(credit)}</p><p className="sous">Voir le carnet →</p>
              </button>
              <div className="carte kpi"><p className="petit muet">Remises</p><p className="kpi-valeur">{s.prix(st.remises)}</p><p className="sous">accordées sur la période</p></div>
              {s.aTables() ? (
                <button className="carte kpi" onClick={() => s.allerA('tables')}>
                  <p className="petit muet">Tables occupées</p><p className="kpi-valeur">{(d.commandes || []).length} / {d.commerce.tables.length}</p><p className="sous">Voir les tables →</p>
                </button>
              ) : (
                <div className="carte kpi"><p className="petit muet">Vendu à crédit</p><p className="kpi-valeur">{s.prix(st.aCredit)}</p><p className="sous">sur la période</p></div>
              )}
            </div>
            <p className="tres-petit muet">Solde = ventes − dépenses, avant les autres charges éventuelles. Marge = prix de vente − prix d’achat.</p>

            {/* Graphique */}
            <div className="carte">
              <h3>Évolution des ventes</h3>
              <p className="info-barre">
                {barre !== null ? <>{st.barres[barre].long} : <b className="chiffre">{s.prix(st.barres[barre].valeur)}</b></> : <span className="muet">Touchez une barre pour voir le détail</span>}
              </p>
              <div className={`graphique ${barre !== null ? 'selection' : ''}`} role="img" aria-label={'Ventes ' + lib.titre}>
                {st.barres.map((b, i) => (
                  <button key={periode + i} className={`col ${barre === i ? 'active' : ''}`} onClick={() => setBarre(barre === i ? null : i)} onMouseEnter={() => setBarre(i)} aria-label={b.long + ' : ' + s.prix(b.valeur)}>
                    <div className="barre" style={{ height: (b.valeur ? Math.max(2, (b.valeur / max) * 100) : 0) + '%' }} />
                  </button>
                ))}
              </div>
              <div className="axe">{st.barres.map((b, i) => <span key={i}>{etiquette(i) ? b.label : ''}</span>)}</div>
            </div>

            <div className="carte">
              <h3>Meilleures ventes</h3>
              <div style={{ marginTop: 14 }}>
                {st.produits.slice(0, 6).map((e, i) => (
                  <div key={e.nom} className="classement-ligne">
                    <div className="ligne espace petit">
                      <span className="tronque"><b>{i + 1}.</b> {e.nom} <span className="muet">× {e.quantite}</span></span>
                      <span className="chiffre" style={{ textAlign: 'right' }}>
                        <b>{s.prix(e.total)}</b>
                        {e.coutConnu && <span className="tres-petit vert-texte bloc-texte">marge {s.prix(e.total - e.cout)}</span>}
                      </span>
                    </div>
                    <div className="jauge"><div style={{ width: (e.total / st.produits[0].total) * 100 + '%' }} /></div>
                  </div>
                ))}
                {!st.produits.length && <p className="muet petit">Aucune vente sur cette période.</p>}
              </div>
            </div>
          </div>

          {/* Colonne secondaire */}
          <div className="pile">
            {stockBas.length > 0 && (
              <div className="carte">
                <div className="ligne"><Icone nom="alerte" style={{ color: 'var(--rouge)' }} /><h3 className="grandit">Stock bas</h3><span className="badge rouge">{stockBas.length}</span></div>
                {stockBas.slice(0, 6).map((p) => (
                  <div key={p.id} className="ligne espace petit" style={{ marginTop: 10 }}>
                    <span className="tronque">{p.nom}</span>
                    <span className={`badge ${stockDe(p) === 0 ? 'rouge' : 'safran'}`}>{stockDe(p) === 0 ? 'Rupture' : stockDe(p) + ' restants'}</span>
                  </div>
                ))}
                {s.gereStock() && <button className="btn secondaire petit bloc" style={{ marginTop: 14 }} onClick={() => s.allerA('stock')}>Gérer le stock</button>}
              </div>
            )}

            <div className="carte">
              <div className="ligne espace"><h3>Dépenses</h3><button className="lien" onClick={() => s.ouvrir('depense')}>+ Ajouter</button></div>
              {st.depenses.slice(0, 6).map((x) => (
                <button key={x.id} className="ligne" style={{ width: '100%', textAlign: 'left', marginTop: 12 }} onClick={() => s.ouvrir('depense', { depense: x })}>
                  <span className="grandit">
                    <b className="bloc-texte tronque petit">{x.note || x.categorie}</b>
                    <span className="tres-petit muet">{formatDate(x.date).slice(0, 5)} · {x.categorie}{x.depuisCaisse ? ' · espèces du jour' : ''}</span>
                  </span>
                  <b className="chiffre petit">−{s.prix(x.montant)}</b>
                </button>
              ))}
              {!st.depenses.length && <p className="muet petit" style={{ marginTop: 10 }}>Aucune dépense sur cette période.</p>}
            </div>

            <div className="carte">
              <div className="ligne espace"><h3>Journées de vente</h3><button className="lien" onClick={() => s.allerA('ventes')}>Tout voir</button></div>
              {journees.map((j) => (
                <button key={j.id} className="ligne" style={{ width: '100%', textAlign: 'left', marginTop: 12 }} onClick={() => (j.fermeLe ? s.ouvrir('ticketCloture', { cloture: j.cloture }) : s.ouvrir('cloture'))}>
                  <span className="grandit">
                    <b className="bloc-texte petit">{formatDate(j.ouverteLe)} · {formatHeure(j.ouverteLe)} → {j.fermeLe ? formatHeure(j.fermeLe) : 'en cours'}</b>
                    <span className="tres-petit muet tronque bloc-texte">{j.ouvertePar}{j.fermePar ? ' / ' + j.fermePar : ''}{j.cloture ? ' · ' + j.cloture.nbVentes + ' tickets · ' + s.prix(j.cloture.totalVentes) : ''}</span>
                  </span>
                  {j.fermeLe ? <BadgeEcart ecart={j.cloture.ecart} /> : <span className="badge">Ouverte</span>}
                </button>
              ))}
              {!journees.length && <p className="muet petit" style={{ marginTop: 10 }}>Aucune journée de vente pour l’instant.</p>}
            </div>

            <Classement titre="Par vendeur" liste={st.vendeurs} suffixe={(e) => e.quantite + ' ventes'} />
            <Classement titre="Par mode de paiement" liste={st.paiements} suffixe={(e) => (st.total ? Math.round((e.total / st.total) * 100) : 0) + ' %'} />
          </div>
        </div>
      </div>
    </>
  );
}

export function BadgeEcart({ ecart }) {
  const s = useKaislo();
  if (ecart === 0) return <span className="badge">Comptes justes</span>;
  return <span className={`badge ${ecart < 0 ? 'rouge' : 'safran'}`}>{ecart < 0 ? 'Manque ' + s.prix(-ecart) : 'Excédent ' + s.prix(ecart)}</span>;
}

function Classement({ titre, liste, suffixe }) {
  const s = useKaislo();
  return (
    <div className="carte">
      <h3>{titre}</h3>
      <div style={{ marginTop: 14 }}>
        {liste.map((e) => (
          <div key={e.nom} className="classement-ligne">
            <div className="ligne espace petit">
              <span className="tronque">{e.nom} <span className="muet">· {suffixe(e)}</span></span>
              <b className="chiffre">{s.prix(e.total)}</b>
            </div>
            <div className="jauge"><div style={{ width: (liste[0].total ? (e.total / liste[0].total) * 100 : 0) + '%' }} /></div>
          </div>
        ))}
        {!liste.length && <p className="muet petit">Aucune vente sur cette période.</p>}
      </div>
    </div>
  );
}

// Les 4 premières étapes d'un nouveau commerce
// Essai gratuit en cours, ou abonnement terminé
function BandeauAbonnement() {
  const s = useKaislo();
  const etat = etatAbonnement(s.d.commerce.abonnement);
  if (etat.statut === 'actif' || etat.statut === 'suspendu') return null;
  const expire = etat.statut === 'expire';
  const lien = 'https://wa.me/' + CONTACT_WHATSAPP + '?text=' + encodeURIComponent('Bonjour, je souhaite activer mon abonnement Kaislo pour « ' + s.d.commerce.nom + ' » (code ' + s.d.commerce.code + ').');
  return (
    <div className={expire ? 'alerte ligne' : 'astuce ligne'} style={{ marginBottom: 16, maxWidth: 720, flexWrap: 'wrap' }}>
      <span className="grandit">
        {expire ? 'Votre période d’essai est terminée. Activez votre abonnement pour continuer sereinement.' : 'Essai gratuit : encore ' + etat.joursRestants + ' jour' + (etat.joursRestants > 1 ? 's' : '') + '.'}
      </span>
      <a className="btn petit" href={lien} target="_blank" rel="noreferrer">Activer l’abonnement</a>
    </div>
  );
}

function PremiersPas() {
  const s = useKaislo();
  const { d } = s;
  if (s.estDemoActuel()) return null;
  const pas = [
    { fait: d.produits.length > 0, titre: 'Ajoutez vos produits', texte: 'Avec leurs prix, options et prix d’achat', action: () => s.allerA('produits') },
    { fait: !!(d.commerce.logo && d.commerce.adresse), titre: 'Complétez votre profil', texte: 'Logo, adresse et téléphone du commerce', action: () => s.allerA('reglages') },
    { fait: d.utilisateurs.some((u) => u.role === 'vendeur'), titre: 'Créez vos vendeurs', texte: 'Chacun aura son propre code PIN', action: () => s.allerA('reglages') },
    { fait: s.imprimante.connectee, titre: 'Connectez l’imprimante', texte: 'Imprimante thermique Bluetooth', action: () => s.allerA('reglages') },
    { fait: d.ventes.length > 0, titre: 'Faites votre première vente', texte: 'Depuis l’écran Vendre', action: () => s.allerA('caisse') },
  ];
  if (pas.every((p) => p.fait)) return null;
  return (
    <div className="carte premiers-pas" style={{ marginBottom: 16, maxWidth: 720 }}>
      <h3>Bienvenue sur Kaislo</h3>
      <p className="petit muet" style={{ marginTop: 4 }}>{pas.length} étapes pour être prêt à vendre :</p>
      {pas.map((p, i) => (
        <button key={i} className={`pas ${p.fait ? 'fait' : ''}`} onClick={p.action}>
          <span className="pas-num">{p.fait ? <Icone nom="ok" taille="sm" /> : i + 1}</span>
          <span className="grandit"><b>{p.titre}</b><span className="tres-petit muet bloc-texte">{p.texte}</span></span>
          {!p.fait && <Icone nom="droite" taille="sm" className="muet" />}
        </button>
      ))}
    </div>
  );
}
