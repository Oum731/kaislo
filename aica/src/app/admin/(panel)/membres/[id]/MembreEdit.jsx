'use client';
import { useActionState } from 'react';
import { updateMembre } from '../../../actions';

const C = [['nom', 'Nom'], ['prenoms', 'Prénoms'], ['naissance_date', 'Date de naissance', 'date'], ['naissance_lieu', 'Lieu de naissance'], ['fonction', 'Fonction'], ['profession', 'Profession'], ['quartier', 'Quartier'], ['telephone', 'Téléphone', 'tel'], ['email', 'E-mail', 'email'], ['urgence_nom', 'Urgence (nom)'], ['urgence_tel', 'Urgence (téléphone)', 'tel'], ['piece_no', 'N° pièce']];

export default function MembreEdit({ m }) {
  const [st, action, pending] = useActionState(updateMembre, null);
  return (
    <form action={action} className="formcard grid2">
      <input type="hidden" name="id" value={m.id} />
      {C.map(([n, l, t]) => (
        <label key={n} className={'field' + (st?.erreurs?.[n] ? ' has-err' : '')}><span className="lbl">{l}</span><input name={n} type={t || 'text'} defaultValue={m[n] ?? ''} />{st?.erreurs?.[n] && <p className="err">{st.erreurs[n]}</p>}</label>
      ))}
      <div className="full"><button className="btn" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer et régénérer la carte'}</button></div>
    </form>
  );
}
