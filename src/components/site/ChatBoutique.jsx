'use client';
// ------------------------------------------------------------
// DISCUSSION EN DIRECT d'une boutique : bulle en bas de la vitrine, le visiteur écrit au commerçant sans compte.
// Son navigateur garde un identifiant aléatoire (localStorage) qui retrouve sa conversation à chaque visite.
// Fermée, la bulle ne fait que compter les réponses nouvelles (toutes les 30 s) ; ouverte, elle relève toutes les 4 s.
// ------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { appelApi } from '@/lib/api';
import { useSondage, fusionnerMessages } from '@/lib/sondage';
import { Icone } from '@/components/ui';
import { formatHeure } from '@/lib/utils/format';

const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, valeur) => { try { localStorage.setItem(cle, valeur); } catch { /* gardé en mémoire seulement */ } };

function identifiantVisiteur() {
  let v = lire('kaislo-visiteur');
  if (!v || !/^[a-f0-9]{24,64}$/.test(v)) {
    const octets = crypto.getRandomValues(new Uint8Array(16));
    v = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
    ecrire('kaislo-visiteur', v);
  }
  return v;
}

export default function ChatBoutique({ slug, nomBoutique, releve = false }) {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [nom, setNom] = useState('');
  const [piege, setPiege] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [vuLe, setVuLe] = useState('');
  const v = useRef('');
  const bas = useRef(null);
  const curseur = useRef('');

  useEffect(() => {
    v.current = identifiantVisiteur();
    setNom(lire('kaislo-visiteur-nom') || '');
    setVuLe(lire('kaislo-chat-vu-' + slug) || '');
  }, [slug]);

  const relever = async () => {
    if (!v.current) return;
    const rep = await appelApi('GET', `/public/chat?b=${encodeURIComponent(slug)}&v=${v.current}${curseur.current ? '&depuis=' + encodeURIComponent(curseur.current) : ''}${ouvert ? '&lire=1' : ''}`);
    if (rep.messages?.length) {
      curseur.current = rep.messages[rep.messages.length - 1].le;
      setMessages((m) => fusionnerMessages(m, rep.messages));
    }
    setErreur('');
  };
  useSondage(relever, ouvert ? 4000 : 30000);

  // À l'ouverture : tout est vu
  useEffect(() => {
    if (!ouvert) return;
    const dernier = messages[messages.length - 1]?.le || '';
    if (dernier && dernier > vuLe) { setVuLe(dernier); ecrire('kaislo-chat-vu-' + slug, dernier); }
    bas.current?.scrollIntoView({ block: 'end' });
  }, [ouvert, messages, slug, vuLe]);

  const nouveautes = messages.filter((m) => m.auteur === 'commerce' && m.le > vuLe).length;

  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      ecrire('kaislo-visiteur-nom', nom.trim());
      const rep = await appelApi('POST', '/public/chat', { b: slug, v: v.current, nom: nom.trim(), texte: texte.trim(), site: piege, depuis: curseur.current });
      if (rep.messages?.length) {
        curseur.current = rep.messages[rep.messages.length - 1].le;
        setMessages((m) => fusionnerMessages(m, rep.messages));
      }
      setTexte('');
      setErreur('');
    } catch (err) {
      setErreur(err.horsLigne ? 'Pas de connexion internet : réessayez quand le réseau revient.' : err.message);
    } finally {
      setEnvoi(false);
    }
  };

  if (!ouvert) {
    return (
      <button className={"chat-bulle-boutique" + (releve ? " releve" : "")} onClick={() => setOuvert(true)} aria-label={'Discuter avec ' + nomBoutique}>
        <Icone nom="bulles" />
        <span>Discuter</span>
        {nouveautes > 0 && <b className="chat-pastille" aria-label={nouveautes + ' nouveau(x) message(s)'}>{nouveautes}</b>}
      </button>
    );
  }

  return (
    <div className="chat-fenetre" role="dialog" aria-label={'Discussion avec ' + nomBoutique}>
      <div className="chat-entete">
        <div><b>{nomBoutique}</b><span className="tres-petit">Répond généralement dans la journée</span></div>
        <button className="icone-btn" onClick={() => setOuvert(false)} aria-label="Fermer">×</button>
      </div>
      <div className="fil-messages chat-fil">
        {messages.length === 0 && <p className="muet petit centre">Une question sur un article, la livraison, la disponibilité ? Écrivez à {nomBoutique} : sa réponse apparaît ici.</p>}
        {messages.map((m) => (
          <div key={m.id} className={'bulle ' + (m.auteur === 'client' ? 'moi' : 'equipe')}>
            <p>{m.texte}</p>
            <span className="tres-petit">{m.auteur === 'client' ? 'Vous' : nomBoutique} · {formatHeure(m.le)}</span>
          </div>
        ))}
        <span ref={bas} />
      </div>
      {erreur && <p className="alerte" style={{ margin: '0 12px 8px' }}>{erreur}</p>}
      <form className="chat-saisie" onSubmit={envoyer}>
        {messages.length === 0 && <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre prénom (facultatif)" maxLength={40} autoComplete="given-name" />}
        <input className="vitrine-piege" tabIndex={-1} autoComplete="off" aria-hidden="true" value={piege} onChange={(e) => setPiege(e.target.value)} />
        <div className="chat-ligne">
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Votre message…" rows={1} maxLength={1000}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(e); } }} />
          <button className="btn" type="submit" disabled={envoi || !texte.trim()}>{envoi ? '…' : 'Envoyer'}</button>
        </div>
        <p className="tres-petit muet">N’écrivez pas d’informations bancaires. Cette discussion est tenue par le commerçant : Kaislo n’est pas partie à l’échange et n’en est en aucun cas responsable.</p>
      </form>
    </div>
  );
}
