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
      <EnTete surTitre="Carnet de crédit" titre="Crédit clients">
        <button className="btn cache-mobile" onClick={() => s.ouvrir('client')}><Icone nom="plus" /> Nouveau client</button>
      </EnTete>
      <div className="contenu" style={{ maxWidth: 900 }}>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="carte kpi kpi-principal" style={{ gridColumn: 'span 2' }}>
            <p className="petit" style={{ opacity: 0.8 }}>Total à récupérer</p>
            <p className="valeur">{s.prix(total)}</p>
            <span className="evolution">{tous.filter((c) => c.solde > 0).length} clients doivent de l’argent</span>
          </div>
        </div>

        <div className="ligne" style={{ margin: '16px 0 12px', flexWrap: 'wrap' }}>
          <label className="recherche grandit" style={{ minWidth: 220 }}>
            <Icone nom="recherche" taille="sm" />
            <input type="search" placeholder="Nom ou téléphone…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <Puces options={[['doivent', 'Qui doivent'], ['tous', 'Tous']]} valeur={filtre} surChanger={setFiltre} />
        </div>

        <div className="liste">
          {liste.map((c) => (
            <button key={c.id} className="liste-item" onClick={() => s.ouvrir('ficheClient', { clientId: c.id })}>
              <span className={`avatar ${c.solde > 0 ? 'gerant' : ''}`}>{initiales(c.nom)}</span>
              <span className="grandit">
                <b className="bloc-texte tronque">{c.nom}</b>
                <span className="tres-petit muet tronque bloc-texte">
                  {c.telephone || 'Pas de téléphone'}{c.dernier ? ' · dernier mouvement le ' + formatDate(c.dernier) : ''}
                </span>
              </span>
              {c.solde > 0 ? <b className="chiffre" style={{ color: 'var(--safran-fonce)' }}>{s.prix(c.solde)}</b> : <span className="badge">À jour</span>}
            </button>
          ))}
          {!liste.length && (
            <div className="vide">
              <p><b>{tous.length ? 'Aucun client ne doit d’argent' : 'Aucun client dans le carnet'}</b></p>
              <p className="petit">Pour vendre à crédit, choisissez « À crédit » au moment de valider la vente.</p>
            </div>
          )}
        </div>
        <button className="bouton-flottant seulement-mobile" onClick={() => s.ouvrir('client')}><Icone nom="plus" /> Client</button>
      </div>
    </>
  );
}
