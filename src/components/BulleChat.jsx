'use client';
// ------------------------------------------------------------
// BULLE « DISCUTER AVEC NOUS » (en bas de l'écran, sur le site et dans l'application)
//  - commerce inscrit en ligne : la messagerie avec l'équipe Kaislo (réponses dans l'application)
//  - visiteur du site ou de la démo : un petit formulaire (nom, WhatsApp ou e-mail, message),
//    l'équipe répond par WhatsApp ou par e-mail
//  - version sans serveur (GitHub Pages) : le message part sur WhatsApp
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { API_ACTIVE, appelApi } from '@/lib/api';
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from '@/config';
import { Icone } from '@/components/ui';

/**
 * messagerie : contenu affiché à la place du formulaire (commerce connecté), sinon null
 * nonLus     : réponses de l'équipe pas encore lues (pastille)
 * position   : 'site' (site, connexion, espace commercial) ou 'app' (application connectée)
 */
export default function BulleChat({ messagerie = null, nonLus = 0, position = 'site' }) {
  const [ouvert, setOuvert] = useState(false);
  const classe = position === 'app' ? ' chat-dans-app' : '';
  // Échap ferme le panneau
  useEffect(() => {
    if (!ouvert) return;
    const touche = (e) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [ouvert]);

  return (
    <>
      {ouvert && (
        <div className={'chat-panneau' + classe} role="dialog" aria-label="Discuter avec l’équipe Kaislo">
          <div className="chat-entete">
            <span className="chat-avatar"><Icone nom="whatsapp" taille="sm" /></span>
            <span className="grandit">
              <b className="bloc-texte">Équipe Kaislo</b>
              <span className="tres-petit bloc-texte" style={{ opacity: 0.8 }}>Réponse en général dans la journée</span>
            </span>
            <button className="icone-btn" onClick={() => setOuvert(false)} aria-label="Fermer"><Icone nom="fermer" taille="sm" /></button>
          </div>
          <div className="chat-corps">{messagerie || <FormulaireContact />}</div>
        </div>
      )}
      <button className={'chat-bouton' + classe + (ouvert ? ' ouvert' : '')} onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} aria-label="Discuter avec l’équipe Kaislo" title="Discuter avec nous">
        <Icone nom={ouvert ? 'fermer' : 'whatsapp'} />
        <span className="chat-libelle">{ouvert ? 'Fermer' : 'Discuter avec nous'}</span>
        {nonLus > 0 && !ouvert ? <span className="pastille-nb">{nonLus}</span> : null}
      </button>
    </>
  );
}

// Formulaire des visiteurs (pas de compte) : l'équipe répond par WhatsApp ou e-mail
function FormulaireContact() {
  const page = usePathname();
  const [f, setF] = useState({ nom: '', contact: '', texte: '', siteWeb: '' });
  const [etat, setEtat] = useState({ envoi: false, envoye: false, erreur: '' });
  const maj = (c) => (e) => setF({ ...f, [c]: e.target.value });
  const pret = f.nom.trim() && f.contact.trim() && f.texte.trim();

  const envoyer = async (e) => {
    e.preventDefault();
    if (!pret || etat.envoi) return;
    // Version sans serveur : le message part directement sur WhatsApp
    if (!API_ACTIVE) {
      const texte = `Bonjour, je suis ${f.nom.trim()} (${f.contact.trim()}).\n\n${f.texte.trim()}`;
      window.open('https://wa.me/' + CONTACT_WHATSAPP + '?text=' + encodeURIComponent(texte), '_blank', 'noopener');
      return setEtat({ envoi: false, envoye: true, erreur: '' });
    }
    setEtat({ envoi: true, envoye: false, erreur: '' });
    try {
      await appelApi('POST', '/contact', { ...f, page });
      setEtat({ envoi: false, envoye: true, erreur: '' });
    } catch (err) {
      setEtat({ envoi: false, envoye: false, erreur: err.horsLigne ? 'Pas de connexion internet : réessayez, ou écrivez-nous sur WhatsApp.' : err.message });
    }
  };

  if (etat.envoye) {
    return (
      <div className="pile centre" style={{ padding: 20 }}>
        <span className="chat-ok"><Icone nom="ok" /></span>
        <b>Merci {f.nom.trim()} !</b>
        <p className="petit muet">Votre message est bien parti. L’équipe Kaislo vous répond {f.contact.includes('@') ? 'par e-mail' : 'sur WhatsApp'}, en général dans la journée.</p>
        <button className="btn secondaire petit" onClick={() => { setF({ ...f, texte: '' }); setEtat({ envoi: false, envoye: false, erreur: '' }); }}>Écrire un autre message</button>
      </div>
    );
  }
  return (
    <form className="pile" style={{ padding: 14 }} onSubmit={envoyer}>
      <p className="bulle equipe" style={{ maxWidth: '100%' }}>
        <span style={{ color: 'inherit', marginTop: 0 }}>Bonjour 👋 Une question sur Kaislo, les tarifs ou l’installation ? Laissez-nous un message.</span>
      </p>
      <label className="champ"><span>Votre nom</span><input value={f.nom} onChange={maj('nom')} maxLength={80} autoComplete="name" /></label>
      <label className="champ"><span>Votre WhatsApp ou e-mail</span><input value={f.contact} onChange={maj('contact')} maxLength={120} placeholder="+225 07 12 34 56 78 ou vous@exemple.com" /></label>
      <label className="champ"><span>Votre message</span><textarea value={f.texte} onChange={maj('texte')} rows={3} maxLength={2000} /></label>
      {/* Piège à robots : invisible pour les humains */}
      <input className="piege" tabIndex={-1} autoComplete="off" value={f.siteWeb} onChange={maj('siteWeb')} aria-hidden="true" />
      {etat.erreur && <p className="alerte">{etat.erreur}</p>}
      <button className="btn bloc" disabled={!pret || etat.envoi}>{etat.envoi ? 'Envoi…' : 'Envoyer'}</button>
      <p className="tres-petit muet centre">
        Ou directement : <a className="lien" href={'https://wa.me/' + CONTACT_WHATSAPP} target="_blank" rel="noreferrer">WhatsApp</a> · <a className="lien" href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>
      </p>
    </form>
  );
}
