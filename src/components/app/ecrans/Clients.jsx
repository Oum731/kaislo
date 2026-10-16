'use client';
// ------------------------------------------------------------
// CARNET DE CRÉDIT : qui doit combien, depuis quand.
// Toucher un client : historique, remboursement, rappel WhatsApp.
// ------------------------------------------------------------
import { useMemo, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { clientsAvecSolde } from '@/lib/donnees/credit';
import { formatDate } from '@/lib/utils/format';
import { Icone, Puces, initiales } from '@/components/ui';
import { EnTete } from '../EnTete';
import { tr } from '@/lib/i18n';

export default function Clients() {
  const s = useKaislo();
  const { d } = s;
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('doivent');
  const tous = useMemo(() => clientsAvecSolde(d), [d]);
  const total = tous.reduce((x, c) => x + c.solde, 0);
  const r = recherche.trim().toLowerCase();
  // Ancienneté de la dette (depuis le dernier mouvement) : récent < 7 jours, à relancer jusqu'à 30 jours, en retard au-delà
  const jours = (c) => (c.dernier ? Math.max(0, Math.floor((Date.now() - new Date(c.dernier).getTime()) / 86400000)) : 0);
  const age = (c) => (jours(c) < 7 ? 'recent' : jours(c) <= 30 ? 'relancer' : 'retard');
  const debiteurs = tous.filter((c) => c.solde > 0);
  const nb = { recent: 0, relancer: 0, retard: 0 };
  debiteurs.forEach((c) => { nb[age(c)]++; });
  const plusGros = Math.max(1, ...debiteurs.map((c) => c.solde));
  const liste = tous
    .filter((c) => (filtre === 'tous' ? true : filtre === 'doivent' ? c.solde > 0 : c.solde > 0 && age(c) === filtre) && (!r || c.nom.toLowerCase().includes(r) || (c.telephone || '').includes(r)))
    .sort((a, b) => b.solde - a.solde);

  return (
    <>
      <EnTete surTitre={tr('Carnet de crédit')} titre={tr('Crédit clients')}>
        <button className="btn cache-mobile" onClick={() => s.ouvrir('client')}><Icone nom="plus" /> {tr('Nouveau client')}</button>
      </EnTete>
      <div className="contenu" style={{ maxWidth: 900 }}>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="carte kpi kpi-principal" style={{ gridColumn: 'span 2' }}>
            <p className="petit" style={{ opacity: 0.8 }}>{tr('Total à récupérer')}</p>
            <p className="valeur">{s.prix(total)}</p>
            <span className="evolution">{tr('{0} clients doivent de l’argent', [debiteurs.length])}</span>
          </div>
        </div>
        {debiteurs.length > 0 && (
          <div className="stock-etats" role="group" aria-label={tr('Ancienneté des dettes')} style={{ marginTop: 14 }}>
            {[['recent', 'bon', tr('Récent'), nb.recent], ['relancer', 'bas', tr('À relancer'), nb.relancer], ['retard', 'rupture', tr('En retard'), nb.retard]].map(([cle, classe, libelle, n]) => (
              <button key={cle} className={`${classe} ${filtre === cle ? 'on' : ''}`} onClick={() => setFiltre(filtre === cle ? 'doivent' : cle)} aria-pressed={filtre === cle}>
                <span className="n">{n}</span>
                <span className="l"><i />{libelle}</span>
              </button>
            ))}
          </div>
        )}

        <div className="ligne" style={{ margin: '16px 0 12px', flexWrap: 'wrap' }}>
          <label className="recherche grandit" style={{ minWidth: 220 }}>
            <Icone nom="recherche" taille="sm" />
            <input type="search" placeholder={tr('Nom ou téléphone…')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <Puces options={[['doivent', tr('Qui doivent')], ['tous', tr('Tous')]]} valeur={filtre} surChanger={setFiltre} />
        </div>

        <div className="liste">
          {liste.map((c) => (
            <button key={c.id} className="liste-item" onClick={() => s.ouvrir('ficheClient', { clientId: c.id })}>
              <span className={`avatar ${c.solde > 0 ? 'gerant' : ''}`}>{initiales(c.nom)}</span>
              <span className="grandit">
                <b className="bloc-texte tronque">{c.nom}</b>
                <span className="tres-petit muet tronque bloc-texte">
                  {c.telephone || tr('Pas de téléphone')}{c.dernier ? ' · ' + formatDate(c.dernier) : ''}
                </span>
                {c.solde > 0 && <span className="jauge"><div style={{ width: Math.max(4, Math.round((c.solde / plusGros) * 100)) + '%', background: age(c) === 'retard' ? 'var(--rouge)' : age(c) === 'relancer' ? 'var(--safran, #e9a23b)' : 'var(--vert)' }} /></span>}
              </span>
              {c.solde > 0 ? (
                <span className="droite">
                  <b className="chiffre bloc-texte" style={{ color: 'var(--safran-fonce)' }}>{s.prix(c.solde)}</b>
                  <span className={'badge ' + (age(c) === 'retard' ? 'rouge' : age(c) === 'relancer' ? 'safran' : '')}>{tr('{0} j', [jours(c)])}</span>
                </span>
              ) : <span className="badge">{tr('À jour')}</span>}
            </button>
          ))}
          {!liste.length && (
            <div className="vide">
              <Icone nom="carnet" style={{ width: 40, height: 40, color: 'var(--vert)' }} />
              <p><b>{tous.length ? tr('Aucun client ne doit d’argent') : tr('Aucun client dans le carnet')}</b></p>
              <p className="petit">{tr('Pour vendre à crédit, choisissez « À crédit » au moment de valider la vente.')}</p>
            </div>
          )}
        </div>
        <button className="bouton-flottant seulement-mobile" onClick={() => s.ouvrir('client')}><Icone nom="plus" /> {tr('Client')}</button>
      </div>
    </>
  );
}
