'use client';
import { useState } from 'react';

export default function ContactForm() {
  const [etat, setEtat] = useState('');
  const [msg, setMsg] = useState('');
  async function envoyer(e) {
    e.preventDefault();
    setEtat('envoi'); setMsg('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setEtat('ok'); e.currentTarget?.reset?.(); } else { setEtat('err'); setMsg(j.erreur || 'Erreur. Réessayez.'); }
    } catch { setEtat('err'); setMsg('Connexion impossible.'); }
  }
  if (etat === 'ok') return <p className="ok banner">Merci ! Votre message a bien été envoyé. Nous vous répondrons rapidement.</p>;
  return (
    <form onSubmit={envoyer} className="formcard">
      <label className="field"><span className="lbl">Nom</span><input name="nom" required minLength={2} autoComplete="name" /></label>
      <label className="field"><span className="lbl">E-mail</span><input name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span className="lbl">Message</span><textarea name="message" rows={5} required minLength={5} /></label>
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
      {etat === 'err' && <p className="err banner">{msg}</p>}
      <button className="btn" disabled={etat === 'envoi'}>{etat === 'envoi' ? 'Envoi…' : 'Envoyer'}</button>
    </form>
  );
}
