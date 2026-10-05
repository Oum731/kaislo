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
  const liste = tous.filter((c) => (filtre === 'tous' || c.solde > 0) && (!r || c.nom.toLowerCase().includes(r) || (c.telephone || '').includes(r)));

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
            <span className="evolution">{tr('{0} clients doivent de l’argent', [tous.filter((c) => c.solde > 0).length])}</span>
          </div>
        </div>

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
                  {c.telephone || tr('Pas de téléphone')}{c.dernier ? ' · ' + tr('dernier mouvement le {0}', [formatDate(c.dernier)]) : ''}
                </span>
              </span>
              {c.solde > 0 ? <b className="chiffre" style={{ color: 'var(--safran-fonce)' }}>{s.prix(c.solde)}</b> : <span className="badge">{tr('À jour')}</span>}
            </button>
          ))}
          {!liste.length && (
            <div className="vide">
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
