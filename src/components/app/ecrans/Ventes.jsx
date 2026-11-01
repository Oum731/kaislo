'use client';
// ------------------------------------------------------------
// ÉCRAN VENTES :
//  - état de la caisse du jour : ouverture / fermeture
//  - tickets (le vendeur ne voit que ses ventes, le gérant voit tout)
//  - journées de vente : historique des ouvertures et fermetures (gérant)
//  - dépenses : historique par jour, avec recherche (gérant)
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { formatHeure, formatDate, formatJourLong } from '@/lib/utils/format';
import { historiqueCaisse, calculerCloture } from '@/lib/donnees/cloture';
import { historiqueDepenses } from '@/lib/donnees/depenses';
import { Icone, Puces, Segment } from '@/components/ui';
import { EnTete } from '../EnTete';
import { BadgeEcart } from './Accueil';
import { tr, tt } from '@/lib/i18n';

export default function Ventes() {
  const s = useKaislo();
  const gerant = s.estGerant();
  const [onglet, setOnglet] = useState(gerant && s.ongletVentes ? s.ongletVentes : 'tickets');
  // L'onglet demandé depuis l'accueil n'est valable qu'une fois
  useEffect(() => { if (s.ongletVentes) useKaislo.setState({ ongletVentes: null }); }, [s.ongletVentes]);

  return (
    <>
      <EnTete surTitre={gerant ? tr('Toutes les ventes du commerce') : tr('Mes ventes')} titre={tr('Ventes')} />
      <div className="contenu" style={{ maxWidth: 900 }}>
        <EtatCaisse />
        {gerant && (
          <div style={{ maxWidth: 520, margin: '16px 0 4px' }}>
            <Segment options={[['tickets', tr('Tickets')], ['journees', tr('Journées de vente')], ['depenses', tr('Dépenses')]]} valeur={onglet} surChanger={setOnglet} />
          </div>
        )}
        {onglet === 'tickets' ? <ListeTickets /> : onglet === 'journees' ? <JourneesCaisse /> : <HistoriqueDepenses />}
      </div>
    </>
  );
}

// Caisse du jour : ouverte (avec bouton Fermer) ou fermée (avec bouton Ouvrir)
export function EtatCaisse({ compact = false }) {
  const s = useKaislo();
  const session = s.caisseOuverte();
  if (!session) {
    return (
      <div className="carte etat-caisse fermee" style={{ marginTop: compact ? 0 : 4 }}>
        <span className="pastille"><Icone nom="caisse" /></span>
        <div className="grandit">
          <b>{tr('La journée est fermée')}</b>
        </div>
        <button className="btn" onClick={() => s.ouvrir('ouverture')}><Icone nom="ok" taille="sm" /> {tr('Ouvrir la journée')}</button>
      </div>
    );
  }
  if (compact) return null; // à l'écran de vente, on n'affiche le bandeau que si elle est fermée
  return (
    <div className="carte etat-caisse ouverte" style={{ marginTop: 4 }}>
      <span className="pastille"><Icone nom="caisse" /></span>
      <div className="grandit">
        <b><i className="point ouvert" />{tr('Journée ouverte depuis {0}', [formatHeure(session.ouverteLe)])}</b>
      </div>
      <button className="btn safran" onClick={() => s.ouvrir('cloture')}><Icone nom="caisse" taille="sm" /> {tr('Fermer')}</button>
    </div>
  );
}

function ListeTickets() {
  const s = useKaislo();
  const { d } = s;
  const gerant = s.estGerant();
  const [filtre, setFiltre] = useState('jour');
  const [recherche, setRecherche] = useState('');

  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  let fin = null;
  if (filtre === 'hier') { fin = new Date(debut); debut.setDate(debut.getDate() - 1); }
  if (filtre === 'semaine') debut.setDate(debut.getDate() - 6);
  const r = recherche.trim().toLowerCase();

  const liste = d.ventes
    .filter((v) => {
      const t = new Date(v.date);
      if (t < debut || (fin && t >= fin)) return false;
      if (!gerant && v.vendeurId !== s.utilisateur.id) return false;
      if (r && !(String(v.numero) === r || (v.clientNom || '').toLowerCase().includes(r) || (v.table || '').toLowerCase().includes(r))) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 200);
  const valides = liste.filter((v) => !v.annulee);
  const total = valides.reduce((x, v) => x + v.total, 0);

  return (
    <>
      <div style={{ marginTop: 14 }}>
        <Puces options={[['jour', tr('Aujourd’hui')], ['hier', tr('Hier')], ['semaine', tr('7 derniers jours')]]} valeur={filtre} surChanger={setFiltre} />
      </div>
      <div className="grille-2" style={{ margin: '14px 0' }}>
        <div className="carte kpi tuile-kpi"><span className="tuile-icone teinte-vert"><Icone nom="depense" /></span><p className="kpi-valeur">{s.prix(total)}</p><p className="tuile-kpi-libelle">{tr('Total')}</p></div>
        <div className="carte kpi tuile-kpi"><span className="tuile-icone teinte-vert"><Icone nom="ventes" /></span><p className="kpi-valeur">{valides.length}</p><p className="tuile-kpi-libelle">{tr('Tickets')}</p></div>
      </div>
      <label className="recherche" style={{ marginBottom: 14 }}>
        <Icone nom="recherche" taille="sm" />
        <input type="search" placeholder={tr('N° de ticket, client ou table…')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>
      {liste.map((v) => {
        const mode = v.annulee ? 'annulee' : v.paiement === 'Crédit' ? 'credit' : v.paiement === 'Espèces' ? 'especes' : v.paiement === 'Carte' ? 'carte' : 'mobile';
        const icone = v.paiement === 'Virement' && !v.annulee ? 'banque' : { annulee: 'fermer', credit: 'carnet', especes: 'billet', carte: 'depense', mobile: 'telephone' }[mode];
        return (
          <button key={v.id} className={`vente-item ${v.annulee ? 'annulee' : ''}`} onClick={() => s.ouvrir('ticket', { vente: v })} aria-label={tr('Ticket n° {0}, {1}', [v.numero, s.prix(v.total)])}>
            <span className="vente-heure">
              {formatHeure(v.date)}
              {filtre === 'semaine' && <span className="tres-petit muet bloc-texte" style={{ fontWeight: 500 }}>{formatDate(v.date).slice(0, 5)}</span>}
            </span>
            <span className={`vente-paiement ${mode}`} title={v.annulee ? tr('Annulée') : tt(v.paiement)}><Icone nom={icone} /></span>
            <span className="grandit" style={{ minWidth: 0 }}>
              <span className="ligne" style={{ gap: 6, flexWrap: 'wrap' }}>
                <b>N° {v.numero}</b>
                {v.annulee && <span className="badge rouge">{tr('Annulée')}</span>}
                {v.table && <span className="badge gris">{v.table}</span>}
                {v.gros && <span className="badge safran">{tr('Gros')}</span>}
                {v.aDistance && <span className="badge"><Icone nom="whatsapp" taille="sm" /></span>}
              </span>
              <span className="tres-petit muet tronque bloc-texte" style={{ marginTop: 3 }}>
                {(mode === 'mobile' || mode === 'credit' ? tt(v.paiement) + ' · ' : '') + (v.refPaiement ? v.refPaiement + ' · ' : '') + (gerant ? v.vendeurNom.split(' ')[0] + ' · ' : '') + (v.clientNom ? v.clientNom + ' · ' : '') + v.lignes.map((l) => l.produitNom || l.nom).join(', ')}
              </span>
            </span>
            <b className="chiffre prix-vente">{s.prix(v.total)}</b>
          </button>
        );
      })}
      {!liste.length && <div className="vide"><p>{tr('Aucune vente sur cette période')}</p></div>}
    </>
  );
}

// Historique des journées de vente (gérant) : toucher une journée affiche son résumé
function JourneesCaisse() {
  const s = useKaislo();
  const journees = historiqueCaisse(s.d).slice(0, 60);
  return (
    <div className="liste" style={{ marginTop: 14 }}>
      {journees.map((j) => {
        const enCours = !j.fermeLe;
        // Journée en cours : on calcule le résumé provisoire
        const c = enCours ? calculerCloture(s.d, new Date(j.ouverteLe), new Date(), j.fondDeCaisse) : j.cloture;
        return (
          <button key={j.id} className="liste-item" onClick={() => (enCours ? s.ouvrir('cloture') : s.ouvrir('ticketCloture', { cloture: j.cloture }))}>
            <span className="grandit">
              <b className="bloc-texte">{formatJourLong(new Date(j.ouverteLe))}</b>
              <span className="tres-petit muet tronque bloc-texte">{tr('{0} → {1} · ouverte par {2}{3}', [formatHeure(j.ouverteLe), enCours ? 'en cours' : formatHeure(j.fermeLe), j.ouvertePar, j.fermePar ? tr(' · fermée par {0}', [j.fermePar]) : ''])}</span>
              <span className="tres-petit muet bloc-texte">{tr('{0} tickets · {1} articles', [c.nbVentes, c.nbArticles ?? '—'])}</span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <b className="chiffre bloc-texte">{s.prix(c.totalVentes)}</b>
              {enCours ? <span className="badge">{tr('Ouverte')}</span> : <BadgeEcart ecart={j.cloture.ecart} />}
            </span>
          </button>
        );
      })}
      {!journees.length && <p className="muet petit" style={{ padding: 16 }}>{tr('Aucune journée de vente pour l’instant.')}</p>}
    </div>
  );
}

// Historique des dépenses (gérant) : par jour, avec la période et une recherche. Toucher une dépense la modifie.
function HistoriqueDepenses() {
  const s = useKaislo();
  const [periode, setPeriode] = useState('mois');
  const [recherche, setRecherche] = useState('');
  const h = historiqueDepenses(s.d.depenses || [], { periode, recherche, libelleCategorie: tt });
  return (
    <>
      <div style={{ marginTop: 14 }} className="ligne espace">
        <Puces options={[['jour', tr('Aujourd’hui')], ['semaine', tr('7 derniers jours')], ['mois', tr('Ce mois')], ['tout', tr('Tout')]]} valeur={periode} surChanger={setPeriode} enveloppe />
        <button className="btn petit" onClick={() => s.ouvrir('depense')}><Icone nom="plus" taille="sm" /> {tr('Dépense')}</button>
      </div>
      <div className="grille-2" style={{ margin: '14px 0' }}>
        <div className="carte kpi tuile-kpi"><span className="tuile-icone teinte-rouge"><Icone nom="baisse" /></span><p className="kpi-valeur">{s.prix(h.total)}</p><p className="tuile-kpi-libelle">{tr('Total des dépenses')}</p></div>
        <div className="carte kpi tuile-kpi"><span className="tuile-icone teinte-vert"><Icone nom="depense" /></span><p className="kpi-valeur">{h.nombre}</p><p className="tuile-kpi-libelle">{tr('Dépenses')}</p></div>
      </div>
      <label className="recherche" style={{ marginBottom: 14 }}>
        <Icone nom="recherche" taille="sm" />
        <input type="search" placeholder={tr('Note, catégorie, personne ou montant…')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>
      {h.jours.map((j) => (
        <div key={j.cle} style={{ marginBottom: 14 }}>
          <div className="ligne espace" style={{ padding: '0 4px 6px' }}>
            <b>{formatJourLong(j.date)} <span className="tres-petit muet">· {formatDate(j.date.toISOString())}</span></b>
            <b className="chiffre petit">−{s.prix(j.total)}</b>
          </div>
          <div className="liste">
            {j.depenses.map((x) => (
              <button key={x.id} className="liste-item" onClick={() => s.ouvrir('depense', { depense: x })}>
                <span className="grandit" style={{ minWidth: 0 }}>
                  <b className="bloc-texte tronque">{x.note || tt(x.categorie)}</b>
                  <span className="tres-petit muet tronque bloc-texte">
                    {formatHeure(x.date)} · {tt(x.categorie)}{x.utilisateurNom ? ' · ' + x.utilisateurNom : ''}{x.depuisCaisse ? ' · ' + tr('espèces du jour') : ''}
                  </span>
                </span>
                <b className="chiffre">−{s.prix(x.montant)}</b>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!h.nombre && <div className="vide"><p>{tr('Aucune dépense sur cette période.')}</p></div>}
    </>
  );
}
