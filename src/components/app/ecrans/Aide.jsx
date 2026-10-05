'use client';
// ------------------------------------------------------------
// ÉCRAN AIDE : messagerie avec l'équipe Kaislo (commerces inscrits en ligne),
// et contacts directs (WhatsApp, e-mail) + tutoriels vidéo.
// Les nouveaux messages de l'équipe sont relevés toutes les 20 secondes.
// ------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { appelApi } from '@/lib/api';
import { estServeur } from '@/lib/donnees/synchro';
import { formatDate, formatHeure } from '@/lib/utils/format';
import { CONTACT_EMAIL, CONTACT_WHATSAPP, chemin } from '@/config';
import { Icone } from '@/components/ui';
import { EnTete } from '../EnTete';
import { tr } from '@/lib/i18n';

const INTERVALLE_MS = 20000;

export default function Aide() {
  const s = useKaislo();
  const enLigne = estServeur(s.d);
  return (
    <>
      <EnTete surTitre={s.d.commerce.nom} titre={tr('Aide et messages')} />
      <div className="contenu" style={{ maxWidth: 760 }}>
        {enLigne ? <Messagerie /> : (
          <p className="astuce">{tr('La messagerie avec l’équipe est disponible pour les commerces inscrits en ligne. En attendant, écrivez-nous sur WhatsApp ou par e-mail.')}</p>
        )}
        <p className="section-titre">{tr('Autres moyens de nous joindre')}</p>
        <div className="grille-2">
          <a className="btn secondaire" href={'https://wa.me/' + CONTACT_WHATSAPP} target="_blank" rel="noreferrer"><Icone nom="whatsapp" /> {tr('WhatsApp')}</a>
          <a className="btn secondaire" href={'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Kaislo — ' + s.d.commerce.nom)}><Icone nom="carnet" /> {CONTACT_EMAIL}</a>
        </div>
        <a className="btn fantome bloc" style={{ marginTop: 10 }} href={chemin('/tutoriels/')} target="_blank" rel="noreferrer"><Icone nom="ecran" /> {tr('Voir les tutoriels vidéo')}</a>
      </div>
    </>
  );
}

export function Messagerie() {
  const s = useKaislo();
  const [messages, setMessages] = useState(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const bas = useRef(null);
  const jeton = s.jetonServeur();

  // Lecture de la conversation (les réponses de l'équipe sont alors marquées lues)
  useEffect(() => {
    let actif = true;
    const lire = async () => {
      try {
        const rep = await appelApi('GET', '/messages', null, jeton);
        if (!actif) return;
        setMessages(rep.messages);
        setErreur('');
        useKaislo.setState({ messagesNonLus: 0 });
      } catch (e) {
        if (actif) setErreur(e.horsLigne ? tr('Pas de connexion internet : les messages s’afficheront dès le retour du réseau.') : e.message);
      }
    };
    lire();
    const minuterie = setInterval(lire, INTERVALLE_MS);
    return () => { actif = false; clearInterval(minuterie); };
  }, [jeton]);
  useEffect(() => { bas.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const envoyer = async () => {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      const rep = await appelApi('POST', '/messages', { texte: texte.trim() }, jeton);
      setMessages(rep.messages);
      setTexte('');
      setErreur('');
    } catch (e) {
      setErreur(e.horsLigne ? tr('Pas de connexion internet : réessayez quand le réseau revient.') : e.message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="carte messagerie">
      <div className="fil-messages">
        {messages === null && !erreur && <p className="muet petit centre">{tr('Chargement…')}</p>}
        {messages?.length === 0 && (
          <p className="muet petit centre">{tr('Une question, un souci, une idée ? Écrivez à l’équipe Kaislo : nous répondons ici, généralement dans la journée.')}</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={'bulle ' + (m.auteur === 'commerce' ? 'moi' : 'equipe')}>
            <p>{m.texte}</p>
            <span className="tres-petit">{m.auteur === 'commerce' ? m.auteurNom : tr('Équipe Kaislo')} · {formatDate(m.le)} {formatHeure(m.le)}</span>
          </div>
        ))}
        <span ref={bas} />
      </div>
      {erreur && <p className="alerte" style={{ margin: '0 14px 10px' }}>{erreur}</p>}
      <div className="saisie-message">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={tr('Votre message à l’équipe Kaislo…')} rows={2} maxLength={2000}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(); }} />
        <button className="btn" onClick={envoyer} disabled={envoi || !texte.trim()}>{envoi ? tr('Envoi…') : tr('Envoyer')}</button>
      </div>
    </div>
  );
}
