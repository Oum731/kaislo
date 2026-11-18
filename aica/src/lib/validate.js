const trim = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function normTel(v) {
  const s = String(v ?? '').trim();
  const plus = s.startsWith('+') || s.startsWith('00');
  const d = s.replace(/\D/g, '').replace(/^00/, '');
  return d ? (plus ? '+' : '') + d : '';
}

// Affichage du type « +212 606-715828 »
export function fmtTel(t) {
  const m = /^\+212(\d{3})(\d+)$/.exec(t);
  if (m) return `+212 ${m[1]}-${m[2]}`;
  const m2 = /^\+(\d{3})(\d{3})(\d+)$/.exec(t);
  return m2 ? `+${m2[1]} ${m2[2]}-${m2[3]}` : t;
}

export const CHAMPS_TEXTE = ['nom', 'prenoms', 'naissance_lieu', 'fonction', 'profession', 'quartier', 'urgence_nom', 'piece_no', 'email'];

// Renvoie { ok, erreurs: {champ: message}, data }
export function validerMembre(f, { admin = false } = {}) {
  const e = {};
  const d = {
    nom: trim(f.nom, 30),
    prenoms: trim(f.prenoms, 40),
    naissance_date: trim(f.naissance_date, 10),
    naissance_lieu: trim(f.naissance_lieu, 40),
    fonction: admin ? trim(f.fonction, 30) || 'Membre' : 'Membre',
    profession: trim(f.profession, 34) || '—',
    quartier: trim(f.quartier, 34) || '—',
    telephone: normTel(f.telephone),
    email: trim(f.email, 80).toLowerCase() || null,
    urgence_nom: trim(f.urgence_nom, 30) || '—',
    urgence_tel: normTel(f.urgence_tel),
    piece_no: trim(f.piece_no, 24).toUpperCase() || '—',
  };
  if (d.nom.length < 2) e.nom = 'Indiquez votre nom.';
  if (d.prenoms.length < 2) e.prenoms = 'Indiquez vos prénoms.';
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d.naissance_date) ? new Date(d.naissance_date + 'T00:00:00Z') : null;
  if (!dt || isNaN(dt) || dt.toISOString().slice(0, 10) !== d.naissance_date) e.naissance_date = 'Date de naissance invalide.';
  else {
    const ans = (Date.now() - dt.getTime()) / 31557600000;
    if (ans < 0 || ans > 110) e.naissance_date = 'Date de naissance invalide.';
  }
  if (d.naissance_lieu.length < 2) e.naissance_lieu = 'Indiquez votre lieu de naissance.';
  if (d.telephone.replace(/\D/g, '').length < 8) e.telephone = 'Numéro de téléphone invalide (ex. +212 6 12 34 56 78).';
  if (d.urgence_tel.replace(/\D/g, '').length < 8) e.urgence_tel = 'Indiquez un numéro à prévenir en cas d’urgence.';
  if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) e.email = 'Adresse e-mail invalide.';
  return { ok: Object.keys(e).length === 0, erreurs: e, data: d };
}

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'article';
}
