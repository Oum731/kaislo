'use client';
// ------------------------------------------------------------
// ESPACE D'UN LIVREUR INDÉPENDANT (lot L5), sans mot de passe : le lien secret envoyé par l'équipe Kaislo.
// On y voit : disponible / indisponible, les courses proposées autour de soi (prix, commission de Kaislo), la course en cours, ses gains.
// La position (si le livreur l'autorise) ne sert qu'à lui proposer des courses proches ; elle est effacée dès qu'il se met indisponible.
// ------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import { appelApi } from '@/lib/api';
import { formatPrix } from '@/lib/utils/format';
import { tr, choisirLangue, chargerLangue, langueDuSite, langueDuNavigateur } from '@/lib/i18n';

export default function EspaceLivreur() {
  const [cle, setCle] = useState('');
  const [prete, setPrete] = useState(false);
  const [d, setD] = useState(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  const lire = useCallback((k) => appelApi('GET', '/public/livreur?k=' + encodeURIComponent(k))
    .then((r) => { setD(r); setErreur(''); })
    .catch((e) => setErreur(e.statut === 404 ? 'introuvable' : e.horsLigne ? 'hors-ligne' : e.message)), []);

  useEffect(() => {
    const l = langueDuSite() || langueDuNavigateur();
    chargerLangue(l).then(() => { choisirLangue(l); setPrete(true); });
    const k = (new URLSearchParams(window.location.search).get('k') || '').toLowerCase();
    setCle(k);
    if (k) lire(k);
  }, [lire]);

  // Les offres se rafraîchissent toutes les 20 secondes tant que la page est ouverte et que le livreur est disponible
  useEffect(() => {
    if (!cle || !d?.livreur.disponible) return undefined;
    const t = setInterval(() => lire(cle), 20000);
    return () => clearInterval(t);
  }, [cle, d?.livreur.disponible, lire]);

  const changerEtat = (disponible) => {
    setOccupe(true);
    const envoyer = (pos) => appelApi('POST', '/public/livreur/etat', { k: cle, disponible, ...(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : {}) })
      .then(() => lire(cle)).catch((e) => setErreur(e.horsLigne ? 'hors-ligne' : e.message)).finally(() => setOccupe(false));
    if (disponible && navigator.geolocation) navigator.geolocation.getCurrentPosition(envoyer, () => envoyer(null), { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
    else envoyer(null);
  };
  const accepter = async (offre) => {
    setOccupe(true);
    setErreur('');
    try {
      const r = await appelApi('POST', '/public/livreur/accepter', { k: cle, offre });
      window.location.href = r.lienCourse;
    } catch (e) { setErreur(e.horsLigne ? 'hors-ligne' : e.message); await lire(cle); }
    setOccupe(false);
  };

  if (!prete) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">…</p></div></div>;
  const texteErreur = erreur === 'introuvable' ? tr('Ce lien n’est plus valable : demandez-en un nouveau à l’équipe Kaislo.') : erreur === 'hors-ligne' ? tr('Pas de connexion internet : réessayez quand le réseau est revenu.') : erreur;
  if (!cle || (!d && erreur)) return <div className="vitrine"><div className="vitrine-centre"><h1>{tr('Espace livreur')}</h1><p className="alerte">{texteErreur || tr('Lien incomplet.')}</p></div></div>;
  if (!d) return <div className="vitrine"><div className="vitrine-centre"><p className="muet">{tr('Chargement…')}</p></div></div>;

  const g = d.gains;
  return (
    <div className="vitrine">
      <div className="vitrine-centre" style={{ textAlign: 'left', justifyItems: 'stretch' }}>
        <h1>{tr('Bonjour {0}', [d.livreur.nom])}</h1>
        <div className="carte pile">
          <b>{d.livreur.disponible ? tr('Vous êtes disponible') : tr('Vous êtes indisponible')}</b>
          <p className="petit muet">{d.livreur.disponible ? tr('Les courses proches de vous s’affichent ici. Votre position n’est utilisée que pour cela.') : tr('Passez disponible pour recevoir des courses.')}</p>
          <button className={d.livreur.disponible ? 'btn secondaire grand' : 'btn grand'} disabled={occupe} onClick={() => changerEtat(!d.livreur.disponible)}>{d.livreur.disponible ? tr('Me mettre indisponible') : tr('Me mettre disponible')}</button>
        </div>
        {d.courseEnCours && (
          <div className="carte pile">
            <b>{tr('Course en cours : n° {0}', [d.courseEnCours.numero])}</b>
            <a className="btn grand" href={d.courseEnCours.lien}>{tr('Ouvrir la course')}</a>
          </div>
        )}
        {!d.courseEnCours && d.livreur.disponible && (
          <>
            <b>{tr('Courses proposées')}</b>
            {d.offres.length === 0 && <p className="petit muet">{tr('Aucune course pour le moment. Cette page se met à jour toute seule.')}</p>}
            {d.offres.map((o) => (
              <div key={o.offre} className="carte pile">
                <div className="ligne" style={{ justifyContent: 'space-between' }}><b>{o.boutique}</b><b>{formatPrix(o.prix, o.devise)}</b></div>
                <p className="petit muet">{o.lieu}{o.distanceKm !== null ? ' · ' + tr('à {0} km de vous', [String(o.distanceKm).replace('.', ',')]) : ''} · {tr('{0} article(s)', [o.articles])}</p>
                <p className="tres-petit muet">{tr('Commission Kaislo sur cette course : {0}. Le commerçant vous paie le prix de la course.', [formatPrix(o.commission, o.devise)])}</p>
                <button className="btn grand" disabled={occupe} onClick={() => accepter(o.offre)}>{tr('Accepter cette course')}</button>
              </div>
            ))}
          </>
        )}
        <div className="carte pile">
          <b>{tr('Mes gains')}</b>
          <p className="petit">{tr('{0} course(s) livrée(s)', [g.courses])} · {tr('prix des courses : {0}', [formatPrix(g.brut, g.devise || 'MAD')])}</p>
          <p className="petit">{tr('Votre part : {0}', [formatPrix(g.net, g.devise || 'MAD')])}</p>
          <p className="petit"><b>{tr('Commission à régler à Kaislo : {0}', [formatPrix(g.commissionDue, g.devise || 'MAD')])}</b></p>
        </div>
        {erreur && <p className="alerte">{texteErreur}</p>}
      </div>
    </div>
  );
}
