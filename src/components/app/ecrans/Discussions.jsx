'use client';
// ------------------------------------------------------------
// ÉCRAN DISCUSSIONS : les clients de la boutique en ligne écrivent au commerçant (gérant), il répond ici.
// La liste est relevée toutes les 8 secondes, la conversation ouverte toutes les 4 secondes (tant que l'écran est visible).
// Un client peut être bloqué (plus aucun message de sa part). La messagerie avec l'équipe Kaislo est dans « Aide ».
// ------------------------------------------------------------
import { useRef, useState, useEffect } from 'react';
import { useKaislo } from '@/store/kaislo';
import { appelApi } from '@/lib/api';
import { estServeur } from '@/lib/donnees/synchro';
import { useSondage, fusionnerMessages } from '@/lib/sondage';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { Icone } from '@/components/ui';
import { EnTete } from '../EnTete';
import { tr } from '@/lib/i18n';

export default function Discussions() {
  const s = useKaislo();
  const jeton = s.jetonServeur();
  const enLigne = estServeur(s.d);
  const [liste, setListe] = useState(null);
  const [actif, setActif] = useState(null); // la discussion est-elle activée sur la boutique (null : pas de boutique)
  const [choisi, setChoisi] = useState(null);
  const [erreur, setErreur] = useState('');

  const relever = async () => {
    const rep = await appelApi('GET', '/chats', null, jeton);
    setListe(rep.chats);
    setActif(rep.actif);
    setErreur('');
    useKaislo.setState({ chatsNonLus: rep.nonLus });
  };
  useSondage(() => relever().catch((e) => setErreur(e.horsLigne ? tr('Pas de connexion internet : les discussions s’afficheront dès le retour du réseau.') : e.message)), 8000, enLigne);

  return (
    <>
      <EnTete surTitre={s.d.commerce.nom} titre={tr('Discussions')} />
      <div className="contenu" style={{ maxWidth: 980 }}>
        {!enLigne && <p className="astuce">{tr('Les discussions avec vos clients sont disponibles pour les commerces inscrits en ligne.')}</p>}
        {enLigne && actif === null && liste && <p className="astuce">{tr('Activez votre boutique en ligne (Compte → Boutique en ligne) : vos clients pourront vous écrire en direct depuis sa page, et vous répondrez ici.')}</p>}
        {enLigne && actif === false && <p className="astuce">{tr('La discussion est désactivée sur votre boutique : les anciens messages restent ici. Réactivez-la dans Compte → Boutique en ligne.')}</p>}
        {erreur && <p className="alerte">{erreur}</p>}
        {enLigne && liste && liste.length === 0 && actif !== null && (
          <div className="carte" style={{ textAlign: 'center', padding: 28 }}>
            <Icone nom="bulles" style={{ width: 40, height: 40, color: 'var(--vert)' }} />
            <p><b>{tr('Aucun message pour le moment')}</b></p>
            <p className="muet petit">{tr('Quand un client vous écrit depuis votre boutique en ligne, il apparaît ici, et vous recevez une notification sur votre téléphone.')}</p>
          </div>
        )}
        {enLigne && liste && liste.length > 0 && (
          <div className={'discussions' + (choisi ? ' ouvert' : '')}>
            <div className="discussions-liste">
              {liste.map((c) => (
                <button key={c.id} className={'discussion-ligne' + (choisi === c.id ? ' actif' : '') + (c.nonLus ? ' non-lu' : '')} onClick={() => setChoisi(c.id)}>
                  <span className="infos">
                    <b className="tronque">{c.nom || tr('Client')}{c.bloque ? ' · ' + tr('bloqué') : ''}</b>
                    <span className="petit muet tronque">{c.dernier ? (c.dernier.auteur === 'commerce' ? tr('Vous : ') : '') + c.dernier.texte : ''}</span>
                    <span className="tres-petit muet">{c.dernierLe ? formatDate(c.dernierLe) + ' ' + formatHeure(c.dernierLe) : ''}</span>
                  </span>
                  {c.nonLus > 0 && <span className="discussion-point">{c.nonLus}</span>}
                </button>
              ))}
            </div>
            <div className="discussion-fil">
              {choisi ? <Conversation key={choisi} id={choisi} jeton={jeton} retour={() => setChoisi(null)} surChange={relever} /> : <p className="muet centre">{tr('Choisissez une discussion.')}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Conversation({ id, jeton, retour, surChange }) {
  const [messages, setMessages] = useState([]);
  const [nom, setNom] = useState('');
  const [bloque, setBloque] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const curseur = useRef('');
  const bas = useRef(null);

  const relever = async () => {
    const rep = await appelApi('GET', `/chats/messages?chat=${encodeURIComponent(id)}${curseur.current ? '&depuis=' + encodeURIComponent(curseur.current) : ''}`, null, jeton);
    setNom(rep.nom);
    setBloque(rep.bloque);
    if (rep.messages.length) {
      curseur.current = rep.messages[rep.messages.length - 1].le;
      setMessages((m) => fusionnerMessages(m, rep.messages));
      surChange?.().catch(() => {});
    }
  };
  useSondage(() => relever().catch((e) => { if (!e.horsLigne) setErreur(e.message); }), 4000);
  useEffect(() => { bas.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const envoyer = async () => {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      const rep = await appelApi('POST', '/chats/messages', { chat: id, texte: texte.trim(), depuis: curseur.current }, jeton);
      curseur.current = rep.messages[rep.messages.length - 1]?.le || curseur.current;
      setMessages((m) => fusionnerMessages(m, rep.messages));
      setTexte('');
      setErreur('');
    } catch (e) {
      setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau revient.') : e.message);
    } finally {
      setEnvoi(false);
    }
  };

  const basculerBlocage = async () => {
    if (!bloque && !window.confirm(tr('Bloquer ce client ? Il ne pourra plus vous écrire depuis cet appareil.'))) return;
    try {
      const rep = await appelApi('POST', '/chats/bloquer', { chat: id, bloque: !bloque }, jeton);
      setBloque(rep.bloque);
      surChange?.().catch(() => {});
    } catch (e) { setErreur(e.message); }
  };

  return (
    <div className="carte messagerie">
      <div className="chat-entete" style={{ background: 'var(--surface-2)', color: 'inherit', borderBottom: '1px solid var(--bordure)' }}>
        <div><b>{nom || tr('Client')}</b></div>
        <span style={{ display: 'flex', gap: 8 }}>
          <button className="btn petit fantome" onClick={basculerBlocage}>{bloque ? tr('Débloquer') : tr('Bloquer')}</button>
          <button className="btn petit fantome seulement-mobile" onClick={retour}>{tr('Retour')}</button>
        </span>
      </div>
      <div className="fil-messages">
        {messages.map((m) => (
          <div key={m.id} className={'bulle ' + (m.auteur === 'commerce' ? 'moi' : 'equipe')}>
            <p>{m.texte}</p>
            <span className="tres-petit">{m.auteur === 'commerce' ? tr('Vous') : nom || tr('Client')} · {formatDate(m.le)} {formatHeure(m.le)}</span>
          </div>
        ))}
        <span ref={bas} />
      </div>
      {erreur && <p className="alerte" style={{ margin: '0 14px 10px' }}>{erreur}</p>}
      <div className="saisie-message">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={tr('Votre réponse…')} rows={2} maxLength={1000}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(); }} />
        <button className="btn" onClick={envoyer} disabled={envoi || !texte.trim()}>{envoi ? tr('Envoi…') : tr('Envoyer')}</button>
      </div>
    </div>
  );
}
