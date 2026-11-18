'use client';
import { useRef, useState } from 'react';

// Choix d'une image (galerie ou appareil photo), réduite sur le téléphone avant l'envoi
// pour que les grosses photos ne bloquent pas l'envoi. Le fichier réduit est placé dans <input name=...>.
export default function ImageField({ name, label, maxSide = 900, camera = false, current, onPreview, error }) {
  const inp = useRef(null), cam = useRef(null);
  const [url, setUrl] = useState(current || null);
  const [busy, setBusy] = useState(false);

  async function choisir(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
      const out = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer(); dt.items.add(out);
      inp.current.files = dt.files;
      const u = URL.createObjectURL(out);
      setUrl(u); onPreview?.(u);
    } catch {
      alert('Image illisible. Essayez une autre photo (JPG ou PNG).');
    }
    setBusy(false);
    if (e.target === cam.current) cam.current.value = '';
  }

  return (
    <div className={'imgfield' + (error ? ' has-err' : '')}>
      <span className="lbl">{label}</span>
      <div className="imgrow">
        <div className="imgprev">{url ? <img src={url} alt="" /> : <span>Aucune image</span>}</div>
        <div className="imgbtns">
          {camera && <button type="button" className="btn small" onClick={() => cam.current.click()} disabled={busy}>📷 Prendre une photo</button>}
          <button type="button" className="btn small ghost" onClick={() => inp.current.click()} disabled={busy}>{busy ? 'Traitement…' : '🖼️ Choisir une image'}</button>
        </div>
      </div>
      <input ref={inp} type="file" name={name} accept="image/*" onChange={choisir} hidden />
      {camera && <input ref={cam} type="file" accept="image/*" capture="user" onChange={choisir} hidden />}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
