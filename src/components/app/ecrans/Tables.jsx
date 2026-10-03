'use client';
// ------------------------------------------------------------
// ÉCRAN TABLES (restaurant) : libres / occupées, montant en cours,
// depuis combien de temps. Toucher une table ouvre sa commande.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { sousTotal } from '@/lib/donnees/vente';
import { EnTete } from '../EnTete';

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
      <EnTete surTitre={`${occupees.length} table${occupees.length > 1 ? 's' : ''} occupée${occupees.length > 1 ? 's' : ''} · ${s.prix(totalEnCours)} en cours`} titre="Tables" />
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
                    <span className="petit">{nbArticles(c)} article{nbArticles(c) > 1 ? 's' : ''} · {minutes < 1 ? 'à l’instant' : minutes + ' min'}</span>
                    <span className="petit">{c.vendeurNom.split(' ')[0]}</span>
                    <span className="montant">{s.prix(sousTotal(c.lignes, s.devise()))}</span>
                  </>
                ) : (
                  <span className="petit" style={{ marginTop: 'auto' }}>Libre · toucher pour ouvrir</span>
                )}
              </button>
            );
          })}
        </div>
        {!d.commerce.tables.length && (
          <p className="astuce">Aucune table configurée. Le gérant peut en ajouter dans Réglages → Tables.</p>
        )}
        <p className="tres-petit muet" style={{ marginTop: 18 }}>
          Une table devient orange après 45 minutes. Touchez une table occupée pour ajouter des plats ou encaisser.
          {s.estGerant() && ' Pour libérer une table sans encaisser, ouvrez-la puis touchez « Libérer ».'}
        </p>
      </div>
    </>
  );
}
