'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export default function Login() {
  const [st, action, pending] = useActionState(login, null);
  return (
    <div className="loginpage">
      <form action={action} className="formcard login">
        <img src="/brand/logo.png" alt="" width="72" height="72" />
        <h1>Administration AICA</h1>
        <label className="field"><span className="lbl">E-mail</span><input name="email" type="email" required autoComplete="username" /></label>
        <label className="field"><span className="lbl">Mot de passe</span><input name="motdepasse" type="password" required autoComplete="current-password" /></label>
        {st?.erreur && <p className="err banner">{st.erreur}</p>}
        <button className="btn" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  );
}
