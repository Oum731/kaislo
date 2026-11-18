'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageField from './ImageField';
import CardView from './CardView';
import { validerMembre } from '@/lib/validate';

const ETAPES = [
  { titre: 'Identité', champs: ['nom', 'prenoms', 'naissance_date', 'naissance_lieu'] },
  { titre: 'Contact', champs: ['telephone', 'email', 'profession', 'quartier', 'piece_no', 'urgence_nom', 'urgence_tel'] },
  { titre: 'Photo', champs: ['photo'] },
];

function Champ({ n, label, v, set, err, type = 'text', hint, req, ...rest }) {
  return (
    <label className={'field' + (err ? ' has-err' : '')}>
      <span className="lbl">{label}{req && <b aria-hidden> *</b>}</span>
      <input name={n} type={type} value={v[n] ?? ''} onChange={(e) => set((s) => ({ ...s, [n]: e.target.value }))} {...rest} />
      {hint && !err && <small>{hint}</small>}
      {err && <p className="err">{err}</p>}
    </label>
  );
}

export default function MemberForm({ admin = false }) {
  const router = useRouter();
  const form = useRef(null);
  const [etape, setEtape] = useState(0);
  const [v, setV] = useState({ fonction: 'Membre' });
  const [errs, setErrs] = useState({});
  const [photoUrl, setPhotoUrl] = useState(null);
  const [consent, setConsent] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurGlobale, setErreurGlobale] = useState('');

  const jour = new Date().toISOString().slice(0, 10);
  const an = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const apercu = {
    nom: v.nom || 'NOM', prenoms: v.prenoms || 'Prénoms', naissance_date: v.naissance_date || '2000-01-01', naissance_lieu: v.naissance_lieu || 'Lieu',
    fonction: v.fonction || 'Membre', profession: v.profession || '—', quartier: v.quartier || '—', telephone: v.telephone || '+212 6 00-000000',
    urgence_nom: v.urgence_nom || '—', urgence_tel: v.urgence_tel || '+212 6 00-000000', piece_no: v.piece_no || '—', number: 'AICA-' + jour.slice(0, 4) + '-0000',
    valid_from: jour, valid_to: an,
  };

  function verifier(idx) {
    const { erreurs } = validerMembre(v, { admin });
    const e = {};
    for (const c of ETAPES[idx].champs) if (erreurs[c]) e[c] = erreurs[c];
    if (idx === 2) {
      const f = form.current.elements.photo?.files?.[0];
      if (!f) e.photo = 'Ajoutez une photo d’identité (visage bien visible, fond clair).';
      if (!admin && !consent) e.consent = 'Veuillez accepter pour continuer.';
    }
    setErrs((s) => ({ ...Object.fromEntries(Object.entries(s).filter(([k]) => !ETAPES[idx].champs.includes(k) && k !== 'consent')), ...e }));
    return Object.keys(e).length === 0;
  }
  const suivant = () => { if (verifier(etape)) { setEtape(etape + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  async function envoyer(ev) {
    ev.preventDefault();
    if (etape < 2) return suivant();
    if (!verifier(2)) return;
    setEnvoi(true); setErreurGlobale('');
    try {
      const r = await fetch('/api/adhesion', { method: 'POST', body: new FormData(form.current) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) return router.push(admin ? `/admin/membres/${j.id}` : `/carte/${j.token}`);
      if (j.erreurs) {
        setErrs(j.erreurs);
        const premier = ETAPES.findIndex((s) => s.champs.some((c) => j.erreurs[c]));
        if (premier >= 0) setEtape(premier);
      } else setErreurGlobale(j.erreur || 'Une erreur est survenue. Réessayez.');
    } catch {
      setErreurGlobale('Connexion impossible. Vérifiez votre réseau et réessayez.');
    }
    setEnvoi(false);
  }

  const p = { v, set: setV };
  return (
    <div className="adhesion">
      <form ref={form} onSubmit={envoyer} noValidate className="formcard">
        <ol className="steps" aria-label="Étapes">
          {ETAPES.map((s, i) => <li key={i} className={i === etape ? 'on' : i < etape ? 'done' : ''}><span>{i < etape ? '✓' : i + 1}</span>{s.titre}</li>)}
        </ol>

        <div hidden={etape !== 0} className="grid2">
          <Champ n="nom" label="Nom" req err={errs.nom} autoComplete="family-name" placeholder="Ex. KOUASSI" {...p} />
          <Champ n="prenoms" label="Prénoms" req err={errs.prenoms} autoComplete="given-name" placeholder="Ex. Jean Marc" {...p} />
          <Champ n="naissance_date" type="date" label="Date de naissance" req err={errs.naissance_date} max={jour} autoComplete="bday" {...p} />
          <Champ n="naissance_lieu" label="Lieu de naissance" req err={errs.naissance_lieu} placeholder="Ex. Abidjan" {...p} />
        </div>

        <div hidden={etape !== 1} className="grid2">
          <Champ n="telephone" type="tel" label="Téléphone (WhatsApp de préférence)" req err={errs.telephone} autoComplete="tel" placeholder="+212 6 12 34 56 78" inputMode="tel" {...p} />
          <Champ n="email" type="email" label="E-mail" err={errs.email} autoComplete="email" hint="Facultatif" {...p} />
          <Champ n="profession" label="Profession" err={errs.profession} placeholder="Ex. Étudiant, Footballeur…" {...p} />
          <Champ n="quartier" label="Quartier à Casablanca" err={errs.quartier} placeholder="Ex. Maârif" {...p} />
          <Champ n="piece_no" label="N° carte de séjour / passeport" err={errs.piece_no} hint="Facultatif, imprimé sur la carte" {...p} />
          {admin && <Champ n="fonction" label="Fonction" err={errs.fonction} placeholder="Membre, Trésorier…" {...p} />}
          <fieldset className="full urg">
            <legend>Personne à prévenir en cas d’urgence</legend>
            <div className="grid2">
              <Champ n="urgence_nom" label="Nom de la personne" err={errs.urgence_nom} placeholder="Ex. Aminata (épouse)" {...p} />
              <Champ n="urgence_tel" type="tel" label="Son téléphone" req err={errs.urgence_tel} placeholder="+212 6 12 34 56 78" inputMode="tel" {...p} />
            </div>
          </fieldset>
        </div>

        <div hidden={etape !== 2}>
          <ImageField name="photo" label="Photo d’identité *" camera maxSide={900} onPreview={(u) => { setPhotoUrl(u); setErrs((s) => ({ ...s, photo: undefined })); }} error={errs.photo} />
          <p className="hint">Visage de face, bien éclairé, sans lunettes de soleil ni casquette. Elle sera recadrée automatiquement.</p>
          {!admin && (
            <label className={'check' + (errs.consent ? ' has-err' : '')}>
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrs((s) => ({ ...s, consent: undefined })); }} />
              <span>Je confirme que ces informations sont exactes et j’accepte qu’AICA les conserve pour gérer mon adhésion et éditer ma carte de membre.</span>
            </label>
          )}
          {errs.consent && <p className="err">{errs.consent}</p>}
        </div>

        <input type="text" name="site_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
        {erreurGlobale && <p className="err banner" role="alert">{erreurGlobale}</p>}

        <div className="actions">
          {etape > 0 && <button type="button" className="btn ghost" onClick={() => setEtape(etape - 1)}>← Retour</button>}
          {etape < 2
            ? <button type="button" className="btn" onClick={suivant}>Continuer →</button>
            : <button type="submit" className="btn" disabled={envoi}>{envoi ? 'Création de la carte…' : 'Générer ma carte'}</button>}
        </div>
      </form>

      <aside className="preview" aria-label="Aperçu de votre carte">
        <p className="eyebrow">Aperçu en direct</p>
        <CardView m={apercu} photoUrl={photoUrl} />
      </aside>
    </div>
  );
}
