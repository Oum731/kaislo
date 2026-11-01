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
import InvitationAvis from '../InvitationAvis';
import { etatAbonnement } from '@/lib/donnees/abonnement';
import { CONTACT_WHATSAPP } from '@/config';
import { tr, tt } from '@/lib/i18n';

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
  const [detail, setDetail] = useState(null); // tuile dont le détail est affiché (toucher pour voir)
  const st = useMemo(() => calculerStats(d.ventes, periode, new Date(), d.depenses || []), [d.ventes, d.depenses, periode]);
  const credit = useMemo(() => totalCreditEnCours(d), [d]);
  const journees = historiqueCaisse(d).slice(0, 5);
  const stockBas = d.produits.filter((p) => p.actif && p.suiviStock && stockDe(p) <= (p.seuilAlerte ?? 5)).sort((a, b) => stockDe(a) - stockDe(b));
  const max = Math.max(1, ...st.barres.map((b) => b.valeur));
  const n = st.barres.length;
  const etiquette = (i) => (n > 20 ? i === 0 || (i + 1) % 5 === 0 : n > 12 ? i % 2 === 0 : true);
  const lib = LIBELLES_PERIODE[periode];
  const prenom = s.utilisateur.nom.split(' ')[0];
  const journeeEnCours = journees.find((j) => !j.fermeLe);
  const gerant = s.utilisateur.role === 'gerant';
  const peutArticles = s.peut('peutGererProduits');
  const barresRecentes = st.barres.slice(-12);
  const maxRecent = Math.max(1, ...barresRecentes.map((b) => b.valeur));

  return (
    <>
      <EnTete surTitre={formatJourLong(new Date()) + ' · ' + d.commerce.nom} titre={tr('Bonjour, {0}', [prenom])} avecLogo />
      <div className="contenu">
        <BandeauAbonnement />
        <PremiersPas />
        <InvitationAvis />
        <div className="ligne" style={{ maxWidth: 620, gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          <Segment options={[['jour', tr('Jour')], ['semaine', tr('Semaine')], ['mois', tr('Mois')], ['annee', tr('Année')]]} valeur={periode} surChanger={(p) => { setPeriode(p); setBarre(null); }} />
          </div>
          {s.utilisateur.role === 'gerant' && <button className="btn secondaire" onClick={() => s.ouvrir('rapport', { periode })} aria-label={tr('Exporter le rapport (Excel, PDF)')} style={{ flex: 'none' }}><Icone nom="carnet" /> <span className="masque-etroit">{tr('Exporter')}</span></button>}
        </div>

        <div className="grille-ecran deux" style={{ marginTop: 16 }}>
          {/* Colonne principale */}
          <div className="pile">
            <div className="carte kpi-principal vert">
              <p className="petit kpi-libelle"><Icone nom="hausse" taille="sm" />{tr('Ventes · {0}', [lib.titre])}</p>
              <p className="valeur">{s.prix(st.total)}</p>
              {st.variation !== null && (
                <span className="evolution" style={st.variation < 0 ? { color: 'var(--rouge)', background: 'var(--rouge-clair)' } : undefined}>
                  <Icone nom={st.variation >= 0 ? 'hausse' : 'baisse'} taille="sm" />{tr('{0} % vs {1}', [(st.variation >= 0 ? '+' : '') + st.variation, lib.prec])}</span>
              )}
              {barresRecentes.some((b) => b.valeur > 0) && (
                <div className="mini-barres" aria-hidden="true">
                  {barresRecentes.map((b, i) => <i key={i} className={b.valeur === maxRecent ? 'haut' : ''} style={{ height: Math.max(6, (b.valeur / maxRecent) * 100) + '%' }} />)}
                </div>
              )}
            </div>
            <div className="actions-rapides">
              <button className="vente" onClick={() => s.allerA('caisse')}><Icone nom="caisse" />{tr('Vendre')}</button>
              <button onClick={() => s.ouvrir('depense')}><Icone nom="plus" />{tr('Dépense')}</button>
              {peutArticles && <button onClick={() => s.ouvrir('produit')}><Icone nom="produits" />{tr('Article')}</button>}
            </div>

            {gerant && (
              <div className="etat-journee">
                <span className="ligne" style={{ gap: 8 }}><i className={'point ' + (journeeEnCours ? 'ouvert' : '')} />{journeeEnCours ? tr('Journée ouverte') : tr('Journée fermée')}{journeeEnCours && <span className="muet">{tr('depuis {0}', [formatHeure(journeeEnCours.ouverteLe)])}</span>}</span>
                <button className="btn petit sombre" onClick={() => s.ouvrir('cloture')}>{journeeEnCours ? tr('Fermer') : tr('Ouvrir')}</button>
              </div>
            )}

            <div className="kpis">
              <Tuile id="tickets" icone="ventes" teinte="vert" libelle={tr('Tickets')} valeur={st.nb} detail={tr('Panier moyen {0}', [s.prix(st.panierMoyen)])} ouvert={detail} surToucher={setDetail} />
              <Tuile id="marge" icone="depense" teinte="vert" libelle={tr('Marge')} valeur={st.marge !== null ? s.prix(st.marge) : '—'} couleur="vert-texte"
                detail={st.tauxMarge !== null ? tr('{0} % des ventes', [st.tauxMarge]) : tr('Ajoutez les prix d’achat')} ouvert={detail} surToucher={setDetail} />
              <Tuile id="depenses" icone="baisse" teinte="rouge" libelle={tr('Dépenses')} valeur={s.prix(st.totalDepenses)} couleur="rouge-texte" detail={tr('Solde {0}', [s.prix(st.solde)])} ouvert={detail} surToucher={setDetail} />
              <Tuile icone="carnet" teinte="safran" libelle={tr('À recevoir')} valeur={s.prix(credit)} couleur="safran-texte" va={() => s.allerA('clients')} />
              <Tuile id="remises" icone="remise" teinte="bleu" libelle={tr('Remises')} valeur={s.prix(st.remises)} detail={tr('accordées sur la période')} ouvert={detail} surToucher={setDetail} />
              {s.aTables() ? (
                <Tuile icone="tables" teinte="bleu" libelle={tr('Tables')} valeur={`${(d.commandes || []).length} / ${d.commerce.tables.length}`} va={() => s.allerA('tables')} />
              ) : (
                <Tuile id="credit" icone="clients" teinte="safran" libelle={tr('Vendu à crédit')} valeur={s.prix(st.aCredit)} detail={tr('sur la période')} ouvert={detail} surToucher={setDetail} />
              )}
            </div>

            {/* Graphique */}
            <div className="carte">
              <h3>{tr('Évolution des ventes')}</h3>
              <p className="info-barre">
                {barre !== null ? <>{st.barres[barre].long} : <b className="chiffre">{s.prix(st.barres[barre].valeur)}</b></> : <span className="muet">{tr('Touchez une barre pour voir le détail')}</span>}
              </p>
              <div className={`graphique ${barre !== null ? 'selection' : ''}`} role="img" aria-label={tr('Ventes {0}', [lib.titre])}>
                {st.barres.map((b, i) => (
                  <button key={periode + i} className={`col ${barre === i ? 'active' : ''}`} onClick={() => setBarre(barre === i ? null : i)} onMouseEnter={() => setBarre(i)} aria-label={b.long + ' : ' + s.prix(b.valeur)}>
                    <div className="barre" style={{ height: (b.valeur ? Math.max(2, (b.valeur / max) * 100) : 0) + '%' }} />
                  </button>
                ))}
              </div>
              <div className="axe">{st.barres.map((b, i) => <span key={i}>{etiquette(i) ? b.label : ''}</span>)}</div>
            </div>

            <div className="carte">
              <h3>{tr('Meilleures ventes')}</h3>
              <div style={{ marginTop: 14 }}>
                {st.produits.slice(0, 6).map((e, i) => (
                  <div key={e.nom} className="classement-ligne">
                    <div className="ligne espace petit">
                      <span className="tronque"><b>{i + 1}.</b> {e.nom} <span className="muet">× {e.quantite}</span></span>
                      <span className="chiffre" style={{ textAlign: 'right' }}>
                        <b>{s.prix(e.total)}</b>
                        {e.coutConnu && <span className="tres-petit vert-texte bloc-texte">{tr('marge {0}', [s.prix(e.total - e.cout)])}</span>}
                      </span>
                    </div>
                    <div className="jauge"><div style={{ width: (e.total / st.produits[0].total) * 100 + '%' }} /></div>
                  </div>
                ))}
                {!st.produits.length && <p className="muet petit">{tr('Aucune vente sur cette période.')}</p>}
              </div>
            </div>
          </div>

          {/* Colonne secondaire */}
          <div className="pile">
            {stockBas.length > 0 && (
              <div className="carte">
                <div className="ligne"><Icone nom="alerte" style={{ color: 'var(--rouge)' }} /><h3 className="grandit">{tr('Stock bas')}</h3><span className="badge rouge">{stockBas.length}</span></div>
                {stockBas.slice(0, 6).map((p) => (
                  <div key={p.id} className="ligne espace petit" style={{ marginTop: 10 }}>
                    <span className="tronque">{p.nom}</span>
                    <span className={`badge ${stockDe(p) === 0 ? 'rouge' : 'safran'}`}>{stockDe(p) === 0 ? tr('Rupture') : tr('{0} restants', [stockDe(p)])}</span>
                  </div>
                ))}
                {s.gereStock() && <button className="btn secondaire petit bloc" style={{ marginTop: 14 }} onClick={() => s.allerA('stock')}>{tr('Gérer le stock')}</button>}
              </div>
            )}

            <div className="carte">
              <div className="ligne espace"><h3>{tr('Dépenses')}</h3><span className="ligne" style={{ gap: 14 }}>{s.estGerant() && <button className="lien" onClick={() => { useKaislo.setState({ ongletVentes: 'depenses' }); s.allerA('ventes'); }}>{tr('Historique')}</button>}<button className="lien" onClick={() => s.ouvrir('depense')}>{tr('+ Ajouter')}</button></span></div>
              {st.depenses.slice(0, 6).map((x) => (
                <button key={x.id} className="ligne" style={{ width: '100%', textAlign: 'left', marginTop: 12 }} onClick={() => s.ouvrir('depense', { depense: x })}>
                  <span className="grandit">
                    <b className="bloc-texte tronque petit">{x.note || x.categorie}</b>
                    <span className="tres-petit muet">{formatDate(x.date).slice(0, 5)} · {tt(x.categorie)}{x.depuisCaisse ? tr(' · espèces du jour') : ''}</span>
                  </span>
                  <b className="chiffre petit">−{s.prix(x.montant)}</b>
                </button>
              ))}
              {!st.depenses.length && <p className="muet petit" style={{ marginTop: 10 }}>{tr('Aucune dépense sur cette période.')}</p>}
            </div>

            <div className="carte">
              <div className="ligne espace"><h3>{tr('Journées de vente')}</h3><button className="lien" onClick={() => s.allerA('ventes')}>{tr('Tout voir')}</button></div>
              {journees.map((j) => (
                <button key={j.id} className="ligne" style={{ width: '100%', textAlign: 'left', marginTop: 12 }} onClick={() => (j.fermeLe ? s.ouvrir('ticketCloture', { cloture: j.cloture }) : s.ouvrir('cloture'))}>
                  <span className="grandit">
                    <b className="bloc-texte petit">{formatDate(j.ouverteLe)} · {formatHeure(j.ouverteLe)} → {j.fermeLe ? formatHeure(j.fermeLe) : tr('en cours')}</b>
                    <span className="tres-petit muet tronque bloc-texte">{j.ouvertePar}{j.fermePar ? ' / ' + j.fermePar : ''}{j.cloture ? ' · ' + tr('{0} tickets', [j.cloture.nbVentes]) + ' · ' + s.prix(j.cloture.totalVentes) : ''}</span>
                  </span>
                  {j.fermeLe ? <BadgeEcart ecart={j.cloture.ecart} /> : <span className="badge">{tr('Ouverte')}</span>}
                </button>
              ))}
              {!journees.length && <p className="muet petit" style={{ marginTop: 10 }}>{tr('Aucune journée de vente pour l’instant.')}</p>}
            </div>

            <Classement titre={tr('Par vendeur')} liste={st.vendeurs} suffixe={(e) => tr('{0} ventes', [e.quantite])} />
            <Classement titre={tr('Par mode de paiement')} liste={st.paiements} suffixe={(e) => (st.total ? Math.round((e.total / st.total) * 100) : 0) + ' %'} />
          </div>
        </div>
      </div>
    </>
  );
}

// Tuile de chiffre : icône + valeur + un mot. Le détail (panier moyen, solde…) s'affiche en touchant la tuile ;
// une tuile avec « va » ouvre directement l'écran concerné.
function Tuile({ id, icone, teinte, libelle, valeur, couleur = '', detail, ouvert, surToucher, va }) {
  const montre = id && ouvert === id;
  return (
    <button className={'carte kpi tuile-kpi ' + (montre ? 'detail' : '')} onClick={() => (va ? va() : surToucher(montre ? null : id))} aria-expanded={va ? undefined : !!montre}>
      <span className={'tuile-icone teinte-' + teinte}><Icone nom={icone} /></span>
      <p className={'kpi-valeur ' + couleur}>{valeur}</p>
      <p className="tuile-kpi-libelle">{libelle}</p>
      {montre && detail && <p className="sous">{detail}</p>}
      {va && <Icone nom="droite" taille="sm" className="tuile-fleche" />}
    </button>
  );
}

export function BadgeEcart({ ecart }) {
  const s = useKaislo();
  if (ecart === 0) return <span className="badge">{tr('Comptes justes')}</span>;
  return <span className={`badge ${ecart < 0 ? 'rouge' : 'safran'}`}>{ecart < 0 ? tr('Manque {0}', [s.prix(-ecart)]) : tr('Excédent {0}', [s.prix(ecart)])}</span>;
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
        {!liste.length && <p className="muet petit">{tr('Aucune vente sur cette période.')}</p>}
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
  const lien = 'https://wa.me/' + CONTACT_WHATSAPP + '?text=' + encodeURIComponent(tr('Bonjour, je souhaite activer mon abonnement Kaislo pour « {0} » (code {1}).', [s.d.commerce.nom, s.d.commerce.code]));
  return (
    <div className={expire ? 'alerte ligne' : 'astuce ligne'} style={{ marginBottom: 16, maxWidth: 720, flexWrap: 'wrap' }}>
      <span className="grandit">
        {expire ? tr('Votre période d’essai est terminée. Activez votre abonnement pour continuer sereinement.') : tr('Essai gratuit : encore {0} jour{1}.', [etat.joursRestants, etat.joursRestants > 1 ? 's' : ''])}
      </span>
      <a className="btn petit" href={lien} target="_blank" rel="noreferrer">{tr('Activer l’abonnement')}</a>
    </div>
  );
}

function PremiersPas() {
  const s = useKaislo();
  const { d } = s;
  if (s.estDemoActuel()) return null;
  const pas = [
    { fait: d.produits.length > 0, titre: tr('Ajoutez vos produits'), texte: tr('Un par un, ou tous d’un coup depuis Excel'), action: () => s.allerA('produits') },
    { fait: !!(d.commerce.logo && d.commerce.adresse), titre: tr('Complétez votre profil'), texte: tr('Logo, adresse et téléphone du commerce'), action: () => s.allerA('reglages') },
    { fait: d.utilisateurs.some((u) => u.role === 'vendeur'), titre: tr('Créez vos vendeurs'), texte: tr('Chacun aura son propre code PIN'), action: () => s.allerA('reglages') },
    { fait: s.imprimante.connectee, titre: tr('Connectez l’imprimante'), texte: tr('Imprimante thermique Bluetooth'), action: () => s.allerA('reglages') },
    { fait: d.ventes.length > 0, titre: tr('Faites votre première vente'), texte: tr('Depuis l’écran Vendre'), action: () => s.allerA('caisse') },
  ];
  if (pas.every((p) => p.fait)) return null;
  return (
    <div className="carte premiers-pas" style={{ marginBottom: 16, maxWidth: 720 }}>
      <h3>{tr('Bienvenue sur Kaislo')}</h3>
      <p className="petit muet" style={{ marginTop: 4 }}>{tr('{0} étapes pour être prêt à vendre :', [pas.length])}</p>
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
