'use client';
// ------------------------------------------------------------
// COURSE D'UN LIVREUR (lot L2) : l'adresse, le montant et deux gestes, sans compte.
//   1. « J'ai récupéré la commande » : elle passe en route, le client est prévenu et voit son code ;
//   2. « Livraison terminée » : le client donne son code à quatre chiffres, le livreur le saisit.
// La page ne montre que cette commande : jamais les ventes, le stock ni les autres commandes du commerce.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { formatPrix } from '@/lib/utils/format';
import { tr, choisirLangue, chargerLangue, langueDuSite, langueDuNavigateur } from '@/lib/i18n';
import { cleNumero } from '@/lib/donnees/telephone';

export default function Course() {
  const [cle, setCle] = useState('');
  const [prete, setPrete] = useState(false); // langue chargée
  const [course, setCourse] = useState(null);
  const [erreur, setErreur] = useState('');
  const [code, setCode] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const l = langueDuSite() || langueDuNavigateur();
    chargerLangue(l).then(() => { choisirLangue(l); setPrete(true); });
    const c = (new URLSearchParams(window.location.search).get('c') || '').toLowerCase();
    setCle(c);
    if (!c) return;
    appelApi('GET', '/public/course?cle=' + encodeURIComponent(c))
      .then((r) => setCourse(r.course))
      .catch((e) => setErreur(e.statut === 404 ? 'introuvable' : e.horsLigne ? 'hors-ligne' : e.message));
  }, []);

  const agir = async (action) => {
    setErreur('');
    setOccupe(true);
    try {
      const r = await appelApi('POST', '/public/course/statut', { cle, action, ...(action === 'livre' ? { code } : {}) });
      setCourse((c) => ({ ...c, statut: r.etat }));
      setCode('');
    } catch (e) { setErreur(e.horsLigne ? 'hors-ligne' : e.message); }
    setOccupe(false);
  };

  if (!prete) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">…</p></div></div>;
  const texteErreur = erreur === 'introuvable' ? tr('Cette course est introuvable ou n’est plus à vous : demandez un nouveau lien à la boutique.') : erreur === 'hors-ligne' ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : erreur;
  if (!cle || (!course && erreur)) return <div className="vitrine"><div className="vitrine-centre"><h1>{tr('Course de livraison')}</h1><p className="alerte">{texteErreur || tr('Lien de course incomplet.')}</p></div></div>;
  if (!course) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">{tr('Chargement…')}</p></div></div>;

  const pays = null;
  const tel = (t) => cleNumero(t, pays) || String(t || '').replace(/\D/g, '');
  const fini = course.statut === 'livree';
  const annulee = course.statut === 'annulee';
  const aRecuperer = ['confirmee', 'prete'].includes(course.statut);
  return (
    <div className="vitrine">
      <div className="vitrine-centre" style={{ textAlign: 'left', justifyItems: 'stretch' }}>
        <h1>{tr('Course n° {0}', [course.numero])}</h1>
        <p className="muet">{course.boutique}{course.lieuBoutique ? ' · ' + course.lieuBoutique : ''}</p>
        {annulee && <p className="alerte">{tr('Cette commande a été annulée. Ne la livrez pas.')}</p>}
        {fini && <p className="info-verte">{tr('Course terminée. Merci !')}</p>}
        <div className="carte pile">
          <b>{tr('À livrer à')}</b>
          <p>{course.client.nom}</p>
          <p style={{ fontWeight: 700 }}>{course.client.adresse}</p>
          {course.note && <p className="petit muet">{tr('Note du client : {0}', [course.note])}</p>}
          <a className="btn secondaire" href={'tel:+' + tel(course.client.telephone)}>{tr('Appeler le client')} · {course.client.telephone}</a>
        </div>
        <div className="carte pile">
          {course.lignes.map((l, i) => <div key={i} className="ligne" style={{ justifyContent: 'space-between' }}><span>{l.quantite} × {l.nom}</span></div>)}
          <div className="ligne" style={{ justifyContent: 'space-between' }}><b>{tr('Montant de la commande')}</b><b>{formatPrix(course.total, course.devise)}</b></div>
          <p className="tres-petit muet">{tr('Livraison comprise. Encaissez-le comme convenu avec la boutique.')}</p>
        </div>
        {course.whatsappBoutique && <a className="btn secondaire" target="_blank" rel="noreferrer" href={'https://wa.me/' + course.whatsappBoutique}>{tr('Écrire à la boutique')}</a>}
        {aRecuperer && <button className="btn grand" disabled={occupe} onClick={() => agir('recupere')}>{tr('J’ai récupéré la commande')}</button>}
        {course.statut === 'en_route' && (
          <div className="carte pile">
            <b>{tr('Remise au client')}</b>
            <p className="petit muet">{tr('Demandez au client son code de livraison à quatre chiffres et saisissez-le.')}</p>
            <input className="pin-saisie" inputMode="numeric" maxLength={4} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-label={tr('Code de livraison')} />
            <button className="btn grand" disabled={occupe || code.length < 4} onClick={() => agir('livre')}>{tr('Livraison terminée')}</button>
          </div>
        )}
        {erreur && <p className="alerte">{texteErreur}</p>}
      </div>
    </div>
  );
}
