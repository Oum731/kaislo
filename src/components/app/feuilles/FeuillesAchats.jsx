'use client';
// ------------------------------------------------------------
// Fenêtres des achats et fournisseurs (Stock → Achats) : nouvel achat, fiche d'un fournisseur (infos, historique, règlement).
// Voir lib/donnees/achats.js.
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { Feuille, Icone, ChampMontant } from '@/components/ui';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { soldeFournisseur, historiqueFournisseur } from '@/lib/donnees/achats';
import { numeroWhatsApp } from '@/lib/donnees/modeles';
import { stockDe } from '@/lib/donnees/stock';
import { tr, tt } from '@/lib/i18n';

const LIGNE_VIDE = { produitId: '', quantite: null, prixAchat: null };

// ---------- Nouvel achat ----------
export function FeuilleAchat({ fournisseurId }) {
  const s = useKaislo();
  const { d } = s;
  const produits = [...d.produits].sort((a, b) => a.nom.localeCompare(b.nom));
  const [fid, setFid] = useState(fournisseurId || '');
  const [nouveau, setNouveau] = useState('');
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }]);
  const [paye, setPaye] = useState(null); // null = tout payé
  const [facture, setFacture] = useState('');
  const [note, setNote] = useState('');
  const maj = (i, x) => setLignes(lignes.map((l, j) => (j === i ? { ...l, ...x } : l)));
  const choisir = (i, produitId) => {
    const p = d.produits.find((x) => x.id === produitId);
    maj(i, { produitId, prixAchat: p?.prixAchat ?? null });
  };
  const total = lignes.reduce((n, l) => n + (Number(l.quantite) || 0) * (Number(l.prixAchat) || 0), 0);
  const aPayer = paye === null ? total : paye;
  const valider = () => {
    let id = fid;
    if (id === '+') {
      const e = s.enregistrerFournisseur({ nom: nouveau }, (f) => { id = f.id; });
      if (e) return s.message(e, 'erreur');
    }
    const err = s.enregistrerAchat({ fournisseurId: id, lignes: lignes.filter((l) => l.produitId), paye: aPayer, numeroFacture: facture, note });
    err ? s.message(err, 'erreur') : s.fermer();
  };
  return (
    <Feuille titre={tr('Nouvel achat')} sousTitre={tr('La marchandise entre dans le stock')} surFermer={s.fermer} pleine
      pied={<button className="btn bloc" onClick={valider} disabled={total <= 0 || !fid || (fid === '+' && !nouveau.trim())}>{tr('Enregistrer l’achat · {0}', [s.prix(total)])}</button>}>
      <div className="pile">
        <label className="champ"><span>{tr('Fournisseur')}</span>
          <select value={fid} onChange={(e) => setFid(e.target.value)}>
            <option value="">{tr('Choisir…')}</option>
            {(d.fournisseurs || []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            <option value="+">{tr('+ Nouveau fournisseur')}</option>
          </select>
        </label>
        {fid === '+' && <label className="champ"><span>{tr('Nom du nouveau fournisseur')}</span><input value={nouveau} onChange={(e) => setNouveau(e.target.value)} maxLength={80} placeholder={tr('Ex : Grossiste Derb Omar')} autoFocus /></label>}
        {lignes.map((l, i) => {
          const p = d.produits.find((x) => x.id === l.produitId);
          return (
            <div key={i} className="carte pile" style={{ padding: 12 }}>
              <select value={l.produitId} onChange={(e) => choisir(i, e.target.value)} aria-label={tr('Article')}>
                <option value="">{tr('Choisir un article…')}</option>
                {produits.map((x) => <option key={x.id} value={x.id}>{x.nom}{x.suiviStock ? ' (' + tr('stock {0}', [stockDe(x)]) + ')' : ''}</option>)}
              </select>
              <div className="grille-2">
                <label className="champ"><span>{tr('Quantité reçue')}</span><ChampMontant valeur={l.quantite} surChanger={(v) => maj(i, { quantite: v })} /></label>
                <label className="champ"><span>{tr('Prix d’achat unitaire')}</span><ChampMontant valeur={l.prixAchat} surChanger={(v) => maj(i, { prixAchat: v })} /></label>
              </div>
              {p && l.quantite > 0 && l.prixAchat !== null && <p className="tres-petit muet">{s.prix(l.quantite * l.prixAchat)}{p.prixAchat && l.prixAchat !== p.prixAchat ? ' · ' + tr('avant : {0}', [s.prix(p.prixAchat)]) : ''}</p>}
              {lignes.length > 1 && <button className="btn secondaire petit" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>{tr('Retirer cette ligne')}</button>}
            </div>
          );
        })}
        <button className="btn secondaire" onClick={() => setLignes([...lignes, { ...LIGNE_VIDE }])}><Icone nom="plus" taille="sm" /> {tr('Ajouter un article')}</button>
        <label className="champ"><span>{tr('Payé tout de suite')}</span><ChampMontant valeur={paye === null ? total : paye} surChanger={(v) => setPaye(v ?? 0)} /></label>
        {total > 0 && aPayer < total && <p className="alerte">{tr('Reste à payer au fournisseur : {0}', [s.prix(total - aPayer)])}</p>}
        <div className="grille-2">
          <label className="champ"><span>{tr('N° de facture (facultatif)')}</span><input value={facture} onChange={(e) => setFacture(e.target.value)} maxLength={40} /></label>
          <label className="champ"><span>{tr('Note (facultatif)')}</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
        </div>
      </div>
    </Feuille>
  );
}

// ---------- Fiche d'un fournisseur ----------
export function FeuilleFournisseur({ fournisseurId }) {
  const s = useKaislo();
  const { d } = s;
  const f = (d.fournisseurs || []).find((x) => x.id === fournisseurId);
  const [b, setB] = useState({ nom: f?.nom || '', telephone: f?.telephone || '', note: f?.note || '' });
  const [montant, setMontant] = useState(null);
  const [mode, setMode] = useState(d.commerce.modesPaiement[0]);
  if (!f) return null;
  const solde = soldeFournisseur(d, f.id);
  const historique = historiqueFournisseur(d, f.id);
  const enregistrer = () => { const e = s.enregistrerFournisseur({ ...b, id: f.id }); e ? s.message(e, 'erreur') : s.message(tr('Fournisseur enregistré')); };
  const regler = () => {
    const e = s.reglerFournisseur({ fournisseurId: f.id, montant, mode });
    if (e) return s.message(e, 'erreur');
    setMontant(null);
  };
  const supprimer = () => {
    if (!window.confirm(tr('Supprimer « {0} » de la liste des fournisseurs ?', [f.nom]))) return;
    const e = s.supprimerFournisseur(f.id);
    e ? s.message(e, 'erreur') : s.fermer();
  };
  const lien = f.telephone ? `https://wa.me/${numeroWhatsApp(f.telephone, d.commerce.pays)}` : null;
  return (
    <Feuille titre={f.nom} sousTitre={solde > 0 ? tr('Vous lui devez {0}', [s.prix(solde)]) : tr('Rien à lui payer')} surFermer={s.fermer} pleine
      pied={<button className="btn bloc" onClick={() => s.ouvrir('achat', { fournisseurId: f.id })}><Icone nom="plus" /> {tr('Nouvel achat chez ce fournisseur')}</button>}>
      <div className="pile">
        {solde > 0 && (
          <div className="carte pile">
            <b>{tr('Payer ce fournisseur')}</b>
            <div className="grille-2">
              <label className="champ"><span>{tr('Montant')}</span><ChampMontant valeur={montant} surChanger={setMontant} placeholder={String(solde)} /></label>
              <label className="champ"><span>{tr('Payé par')}</span><select value={mode} onChange={(e) => setMode(e.target.value)}>{d.commerce.modesPaiement.map((m) => <option key={m} value={m}>{tt(m)}</option>)}</select></label>
            </div>
            <div className="grille-2">
              <button className="btn" onClick={regler} disabled={!(montant > 0)}>{tr('Noter le paiement')}</button>
              <button className="btn secondaire" onClick={() => setMontant(solde)}>{tr('Tout solder ({0})', [s.prix(solde)])}</button>
            </div>
          </div>
        )}
        <div className="carte pile">
          <label className="champ"><span>{tr('Nom')}</span><input value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} maxLength={80} /></label>
          <label className="champ"><span>{tr('Téléphone')}</span><input type="tel" value={b.telephone} onChange={(e) => setB({ ...b, telephone: e.target.value })} maxLength={30} /></label>
          <label className="champ"><span>{tr('Note')}</span><input value={b.note} onChange={(e) => setB({ ...b, note: e.target.value })} maxLength={200} placeholder={tr('Ex : livre le mardi, paiement à 30 jours')} /></label>
          <div className="grille-2">
            <button className="btn secondaire" onClick={enregistrer}>{tr('Enregistrer')}</button>
            {lien ? <a className="btn secondaire" href={lien} target="_blank" rel="noreferrer"><Icone nom="whatsapp" taille="sm" /> WhatsApp</a> : <button className="btn secondaire danger" onClick={supprimer}>{tr('Supprimer')}</button>}
          </div>
          {lien && <button className="btn secondaire danger petit" onClick={supprimer}>{tr('Supprimer ce fournisseur')}</button>}
        </div>
        <b className="petit">{tr('Historique')}</b>
        {!historique.length ? <p className="muet petit">{tr('Aucun achat pour l’instant.')}</p> : historique.map((x) => (
          <div key={x.id} className="carte" style={{ padding: '10px 12px' }}>
            {x.type === 'achat' ? (
              <>
                <p className="ligne espace"><b>{tr('Achat')}{x.numeroFacture ? ' · ' + x.numeroFacture : ''}</b><b className="chiffre">{s.prix(x.total)}</b></p>
                <p className="tres-petit muet">{x.lignes.map((l) => l.quantite + ' × ' + l.produitNom).join(', ')}</p>
                <p className="tres-petit muet">{formatDate(x.date)} {formatHeure(x.date)} · {tr('payé {0}', [s.prix(x.paye)])}{x.total > x.paye ? ' · ' + tr('reste {0}', [s.prix(x.total - x.paye)]) : ''}{x.utilisateurNom ? ' · ' + x.utilisateurNom : ''}</p>
              </>
            ) : (
              <>
                <p className="ligne espace"><b>{tr('Paiement')} · {tt(x.mode)}</b><b className="chiffre vert-texte">{s.prix(x.montant)}</b></p>
                <p className="tres-petit muet">{formatDate(x.date)} {formatHeure(x.date)}{x.utilisateurNom ? ' · ' + x.utilisateurNom : ''}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </Feuille>
  );
}
