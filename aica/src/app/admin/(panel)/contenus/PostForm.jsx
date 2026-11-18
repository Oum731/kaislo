'use client';
import { useActionState } from 'react';
import ImageField from '@/components/ImageField';
import { savePost } from '../../actions';

export default function PostForm({ post }) {
  const [st, action, pending] = useActionState(savePost, null);
  return (
    <form action={action} className="formcard">
      <input type="hidden" name="id" value={post.id || ''} />
      <label className="field"><span className="lbl">Type</span>
        <select name="type" defaultValue={post.type}><option value="event">Événement</option><option value="action">Action menée</option><option value="activity">Activité</option></select></label>
      <label className="field"><span className="lbl">Titre *</span><input name="title" defaultValue={post.title || ''} required maxLength={140} /></label>
      <div className="grid2">
        <label className="field"><span className="lbl">Date et heure</span><input name="event_date" type="datetime-local" defaultValue={post.event_local || ''} /><small>Pour un événement. Heure de Casablanca.</small></label>
        <label className="field"><span className="lbl">Lieu</span><input name="location" defaultValue={post.location || ''} maxLength={120} /></label>
      </div>
      <label className="field"><span className="lbl">Résumé (affiché sur les cartes)</span><input name="summary" defaultValue={post.summary || ''} maxLength={300} /></label>
      <label className="field"><span className="lbl">Description complète</span><textarea name="body" rows={10} defaultValue={post.body || ''} /><small>Séparez les paragraphes par une ligne vide.</small></label>
      <ImageField name="image" label="Image de couverture" maxSide={1400} current={post.has_image ? `/api/media/${post.id}` : null} />
      {post.has_image && <label className="check"><input type="checkbox" name="remove_image" /><span>Supprimer l’image actuelle</span></label>}
      <label className="check"><input type="checkbox" name="published" defaultChecked={post.published} /><span>Publié sur le site (décochez pour garder en brouillon)</span></label>
      {st?.erreur && <p className="err banner">{st.erreur}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  );
}
