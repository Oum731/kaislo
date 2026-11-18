import { isAdmin } from '@/lib/auth';
import { listerMembres } from '@/lib/members';
import { fmtTel } from '@/lib/validate';

export const runtime = 'nodejs';

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; // anti-injection de formules Excel

export async function GET() {
  if (!(await isAdmin())) return new Response('Non autorisé', { status: 401 });
  const rows = await listerMembres({});
  const head = ['N° carte', 'Nom', 'Prénoms', 'Naissance', 'Lieu', 'Fonction', 'Profession', 'Quartier', 'Téléphone', 'E-mail', 'Urgence (nom)', 'Urgence (tél)', 'N° pièce', 'Statut', 'Valable du', 'Au', 'Inscrit le'];
  const lines = rows.map((m) => [m.number, m.nom, m.prenoms, m.naissance_date, m.naissance_lieu, m.fonction, m.profession, m.quartier, fmtTel(m.telephone), m.email, m.urgence_nom, fmtTel(m.urgence_tel), m.piece_no, m.status === 'active' ? 'Active' : 'Révoquée', m.valid_from, m.valid_to, new Date(m.created_at).toISOString().slice(0, 10)].map(cell).join(';'));
  return new Response('﻿' + [head.map(cell).join(';'), ...lines].join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="membres-aica.csv"' } });
}
