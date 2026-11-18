import { membreParNumero } from '@/lib/members';
import { fmtDate } from '@/lib/card-layout';
import { dbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vérification de carte', robots: { index: false } };

export default async function Verification({ params }) {
  const { number } = await params;
  const m = dbConfigured() && /^AICA-\d{4}-\d{4,}$/i.test(decodeURIComponent(number)) ? await membreParNumero(decodeURIComponent(number)) : null;
  const today = new Date().toISOString().slice(0, 10);
  const etat = !m ? 'inconnue' : m.status !== 'active' ? 'revoquee' : m.valid_to < today ? 'expiree' : 'valide';
  const txt = { valide: ['✅ Carte valide', 'ok'], expiree: ['⚠️ Carte expirée', 'warn'], revoquee: ['⛔ Carte révoquée', 'err'], inconnue: ['❌ Carte inconnue', 'err'] }[etat];
  return (
    <div className="wrap page narrow center">
      <h1>Vérification de carte</h1>
      <p className={`${txt[1]} banner big`}>{txt[0]}</p>
      {m && (
        <dl className="verif">
          <dt>N°</dt><dd>{m.number}</dd>
          <dt>Titulaire</dt><dd>{m.prenoms} {m.nom.toUpperCase()}</dd>
          <dt>Fonction</dt><dd>{m.fonction}</dd>
          <dt>Valable</dt><dd>du {fmtDate(m.valid_from)} au {fmtDate(m.valid_to)}</dd>
        </dl>
      )}
      <p className="hint">Comparez le nom et la photo avec la personne qui présente la carte.</p>
    </div>
  );
}
