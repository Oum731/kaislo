'use client';
// ------------------------------------------------------------
// ÉCRAN TABLES (restaurant) : libres / occupées, montant en cours,
// depuis combien de temps. Toucher une table ouvre sa commande.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { sousTotal } from '@/lib/donnees/vente';
import { EnTete } from '../EnTete';
import { tr } from '@/lib/i18n';

const nbArticles = (c) => c.lignes.reduce((x, l) => x + l.quantite, 0);

export default function Tables() {
  const s = useKaislo();
  const { d } = s;
  // Rafraîchit les durées chaque minute
  const [, setMaintenant] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const occupees = (d.commandes || []).filter((c) => c.lignes.length);
  const totalEnCours = occupees.reduce((x, c) => x + sousTotal(c.lignes, s.devise()), 0);

  return (
    <>
      <EnTete surTitre={tr('{0} table{1} occupée{2} · {3} en cours', [occupees.length, occupees.length > 1 ? 's' : '', occupees.length > 1 ? 's' : '', s.prix(totalEnCours)])} titre={tr('Tables')} />
      <div className="contenu">
        <div className="grille-tables">
          {d.commerce.tables.map((table) => {
            const c = (d.commandes || []).find((x) => x.table === table && x.lignes.length);
            const minutes = c ? Math.floor((Date.now() - new Date(c.ouverteLe)) / 60000) : 0;
            return (
              <button key={table} className={`table-carte ${c ? 'occupee' : ''} ${c && minutes >= 45 ? 'longue' : ''}`} onClick={() => s.ouvrirTable(table)}>
                <span className="nom">{table}</span>
                {c ? (
                  <>
                    <span className="petit">{tr('{0} article{1} · {2}', [nbArticles(c), nbArticles(c) > 1 ? 's' : '', minutes < 1 ? tr('à l’instant') : minutes + ' min'])}</span>
                    <span className="petit">{c.vendeurNom.split(' ')[0]}</span>
                    <span className="montant">{s.prix(sousTotal(c.lignes, s.devise()))}</span>
                  </>
                ) : (
                  <span className="petit" style={{ marginTop: 'auto' }}>{tr('Libre · toucher pour ouvrir')}</span>
                )}
              </button>
            );
          })}
        </div>
        {!d.commerce.tables.length && (
          <p className="astuce">{tr('Aucune table configurée. Le gérant peut en ajouter dans Réglages → Tables.')}</p>
        )}
        <p className="tres-petit muet" style={{ marginTop: 18 }}>{tr('Une table devient orange après 45 minutes. Touchez une table occupée pour ajouter des plats ou terminer la vente. {0}', [s.estGerant() && tr(' Pour libérer une table sans terminer la vente, ouvrez-la puis touchez « Libérer ».')])}</p>
      </div>
    </>
  );
}
