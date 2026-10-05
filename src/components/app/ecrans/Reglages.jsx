'use client';
// ------------------------------------------------------------
// RÉGLAGES (gérant) : équipe et droits, postes, commerce, tables, imprimante
// ------------------------------------------------------------
import { useState } from 'react';
import { useKaislo } from '@/store/kaislo';
import { typeCommerce, paysParId } from '@/lib/donnees/modeles';
import { enregistrerImage, supprimerImage } from '@/lib/donnees/images';
import { exporterTout, exporterVentesCsv } from '@/lib/donnees/export';
import { NOMS_DEVISES, formatDate } from '@/lib/utils/format';
import AbonnementCommerce from './Abonnement';
import Postes from './Postes';
import { posteParId } from '@/lib/donnees/postes';
import { Icone, Segment, SelecteurLangue, Interrupteur, Avatar, ApercuTicket, Reglage, ChampMontant, ChoixImage, ImageStockee } from '@/components/ui';
import { EnTete } from '../EnTete';
import { tr, tt, langueActive } from '@/lib/i18n';

export default function Reglages() {
  const s = useKaislo();
  const { d } = s;
  const [onglet, setOnglet] = useState('equipe');
  const avecTables = typeCommerce(d.commerce.type).tables || d.commerce.tables.length > 0;
  const options = [['equipe', 'Équipe'], ['postes', 'Postes'], ['commerce', 'Profil'], ...(avecTables ? [['tables', 'Tables']] : []), ['imprimante', 'Imprimante']];

  return (
    <>
      <EnTete surTitre={d.commerce.nom} titre={tr('Réglages')} />
      <div className="contenu" style={{ maxWidth: 820 }}>
        <Segment options={options} valeur={onglet} surChanger={setOnglet} />
        <div style={{ marginTop: 18 }}>
          {onglet === 'equipe' && <Equipe />}
          {onglet === 'postes' && <Postes />}
          {onglet === 'commerce' && <InfosCommerce />}
          {onglet === 'tables' && <ConfigTables />}
          {onglet === 'imprimante' && <BlocImprimante />}
        </div>
      </div>
    </>
  );
}

function Equipe() {
  const s = useKaislo();
  const { d } = s;
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  const duJour = (u) => d.ventes.filter((v) => !v.annulee && v.vendeurId === u.id && new Date(v.date) >= debut).reduce((x, v) => x + v.total, 0);
  return (
    <>
      <div className="entete-section">
        <p className="section-titre" style={{ marginTop: 0 }}>{tr('Personnes autorisées à vendre')}</p>
        <button className="btn petit cache-mobile" onClick={() => s.ouvrir('utilisateur')}><Icone nom="plus" taille="sm" /> {tr('Vendeur')}</button>
      </div>
      <div className="liste">
        {d.utilisateurs.map((u) => (
          <div key={u.id} className={`liste-item cliquable ${u.actif ? '' : 'inactif'}`} onClick={() => s.ouvrir('utilisateur', { utilisateur: u })}>
            <Avatar nom={u.nom} gerant={u.role === 'gerant'} />
            <span className="grandit">
              <span className="ligne" style={{ gap: 6, flexWrap: 'wrap' }}>
                <b className="tronque">{u.nom}</b>
                <span className={`badge ${u.role === 'gerant' ? 'safran' : 'gris'}`}>{u.role === 'gerant' ? tr('Gérant') : tr('Vendeur')}</span>
                {u.role !== 'gerant' && <span className="badge gris">{tr('Poste : {0}', [posteParId(d, u.posteId).nom])}</span>}
                {u.role !== 'gerant' && u.peutGererProduits && <span className="badge">{tr('+ Produits')}</span>}
                {u.role !== 'gerant' && u.peutFaireRemises && <span className="badge">{tr('+ Remises')}</span>}
              </span>
              <span className="tres-petit muet bloc-texte">{u.telephone ? u.telephone : <span className="rouge-texte">{tr('Téléphone manquant : il ne peut pas se connecter')}</span>} {tr('· aujourd’hui {0}', [s.prix(duJour(u))])}</span>
            </span>
            {u.role !== 'gerant' && (
              <span onClick={(e) => e.stopPropagation()}>
                <Interrupteur actif={u.actif} surChanger={() => s.basculerUtilisateur(u.id)} label={u.actif ? tr('Désactiver') : tr('Activer')} />
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="tres-petit muet centre" style={{ marginTop: 16 }}>{tr('Touchez un vendeur pour changer son code PIN et ses droits. Un vendeur désactivé ne peut plus se connecter.')}</p>
      <button className="bouton-flottant seulement-mobile" onClick={() => s.ouvrir('utilisateur')}><Icone nom="plus" /> {tr('Vendeur')}</button>
    </>
  );
}

function InfosCommerce() {
  const s = useKaislo();
  const { d } = s;
  const [b, setB] = useState({ ...d.commerce });
  const [nouveauLogo, setNouveauLogo] = useState(null);
  const [logoRetire, setLogoRetire] = useState(false);
  const maj = (champ) => (e) => setB({ ...b, [champ]: e.target.value });

  const enregistrer = async () => {
    let infos = b;
    try {
      // Le logo est enregistré dans la base d'images de l'appareil
      if (nouveauLogo) infos = { ...b, logo: await enregistrerImage(nouveauLogo, b.logo) };
      else if (logoRetire && b.logo) {
        await supprimerImage(b.logo);
        infos = { ...b, logo: null };
      }
    } catch {
      return s.message(tr('Impossible d’enregistrer le logo sur cet appareil'), 'erreur');
    }
    const err = s.enregistrerInfosCommerce(infos);
    if (err) return s.message(err, 'erreur');
    setB(infos);
    setNouveauLogo(null);
    setLogoRetire(false);
  };

  return (
    <div className="pile">
      {/* Aperçu du profil tel qu'il apparaît dans l'application */}
      <div className="carte profil-apercu">
        {nouveauLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nouveauLogo} alt="" className="logo-commerce" />
        ) : (
          <ImageStockee reference={logoRetire ? null : b.logo} className="logo-commerce" alt="" secours={<span className="logo-commerce logo-vide">{typeCommerce(d.commerce.type).emoji}</span>} />
        )}
        <div className="grandit">
          <h2 className="tronque">{b.nom || tr('Votre commerce')}</h2>
          <p className="petit muet">{tt(typeCommerce(d.commerce.type).nom)}{b.ville ? ' · ' + b.ville : ''}</p>
          {(b.telephone || b.adresse) && <p className="tres-petit muet tronque">{[b.adresse, b.telephone].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>

      <p className="section-titre">{tr('Logo du profil')}</p>
      <div className="carte pile">
        <ChoixImage
          forme="logo"
          reference={b.logo}
          nouvelle={nouveauLogo}
          retiree={logoRetire}
          surChoisir={(x) => { setNouveauLogo(x); setLogoRetire(false); }}
          surRetirer={() => { setNouveauLogo(null); setLogoRetire(true); }}
          libelle={tr('Ajouter votre logo')}
        />
        <p className="tres-petit muet">{tr('Le logo s’affiche sur votre profil : écran de connexion, tableau de bord et liste des commerces.')}</p>
        <Reglage titre={tr('L’imprimer aussi sur les reçus')} aide={tr('Facultatif. Imprimé en noir et blanc en haut du ticket (impression un peu plus lente).')} actif={b.logoSurTicket === true} surChanger={(v) => setB({ ...b, logoSurTicket: v })} />
      </div>

      <p className="section-titre">{tr('Coordonnées (sur le profil et les reçus)')}</p>
      <div className="carte pile">
        <label className="champ"><span>{tr('Nom du commerce')}</span><input value={b.nom} onChange={maj('nom')} /></label>
        <div className="grille-2">
          {d.commerce.serveur ? (
            <label className="champ"><span>{tr('Téléphone (identifiant du commerce)')}</span>
              <input value={b.telephone || ''} disabled />
              <span className="tres-petit muet">{tr('Pour le changer, écrivez à l’équipe Kaislo (Messages).')}</span>
            </label>
          ) : (
            <label className="champ"><span>{tr('Téléphone')}</span><input type="tel" value={b.telephone || ''} onChange={maj('telephone')} placeholder="+225 07…" /></label>
          )}
          <label className="champ"><span>{tr('E-mail (facultatif)')}</span><input type="email" value={b.email || ''} onChange={maj('email')} placeholder={tr('contact@…')} /></label>
        </div>
        <label className="champ"><span>{tr('Adresse')}</span><input value={b.adresse || ''} onChange={maj('adresse')} placeholder={tr('N°, rue, quartier')} /></label>
        <label className="champ"><span>{tr('Ville')}</span><input value={b.ville || ''} onChange={maj('ville')} /></label>
        <label className="champ"><span>{tr('Message en bas du ticket')}</span><textarea value={b.piedTicket || ''} onChange={maj('piedTicket')} /></label>
      </div>

      <p className="section-titre">{tr('Localisation sur la carte')}</p>
      <Localisation b={b} setB={setB} />

      <p className="section-titre">{tr('Ventes')}</p>
      <div className="carte pile">
        <label className="champ"><span>{tr('Fond de départ habituel (monnaie du matin)')}</span>
          <ChampMontant valeur={b.fondDeCaisse} surChanger={(v) => setB({ ...b, fondDeCaisse: v })} />
        </label>
        <Reglage
          titre={tr('Gestion du stock et de l’inventaire')}
          aide={tr('Quantités en stock, entrées de marchandise, inventaire, alertes de rupture et code-barres. Utile aussi pour les boissons d’un restaurant.')}
          actif={b.gestionStock ?? typeCommerce(d.commerce.type).gereStock}
          surChanger={(v) => setB({ ...b, gestionStock: v })}
        />
      </div>
      <button className="btn grand bloc" onClick={enregistrer}>{tr('Enregistrer les informations')}</button>

      <p className="section-titre">{tr('Compte')}</p>
      <div className="carte pile">
        <div className="ligne espace">
          <div>
            <p className="petit muet">{tr('Code du commerce')}</p>
            <p className="kpi-valeur" style={{ letterSpacing: 3 }}>{d.commerce.code}</p>
          </div>
          <button className="btn secondaire petit" onClick={() => { navigator.clipboard?.writeText(d.commerce.code); s.message(tr('Code copié')); }}>{tr('Copier')}</button>
        </div>
        <div className="champ"><span>{tr('Langue')}</span><SelecteurLangue langue={langueActive()} surChanger={s.changerLangue} /></div>
        <p className="tres-petit muet">{tr('Référence de votre commerce chez Kaislo (support, abonnement). Pour se connecter, chacun utilise son numéro de téléphone et son code PIN.')}</p>
        <AbonnementCommerce />
        <div className="grille-2">
          <label className="champ"><span>{tr('Type')}</span><input disabled value={tt(typeCommerce(d.commerce.type).nom)} /></label>
          <label className="champ"><span>{tr('Devise')}</span><input disabled value={tr(NOMS_DEVISES[d.commerce.devise] || d.commerce.devise)} /></label>
        </div>
        <p className="tres-petit muet">{tr('Paiements acceptés : {0} et crédit client.', [d.commerce.modesPaiement.map(tt).join(', ')])}</p>
      </div>

      <p className="section-titre">{tr('Vos données')}</p>
      <div className="carte pile">
        <p className="petit muet">{tr('Vos données vous appartiennent. Téléchargez-les à tout moment : pour votre comptable, ou pour garder une copie.')}</p>
        <div className="grille-2">
          <button className="btn secondaire" onClick={() => exporterVentesCsv(d)}>{tr('Ventes (Excel, CSV)')}</button>
          <button className="btn secondaire" onClick={() => exporterTout(d)}>{tr('Sauvegarde complète')}</button>
        </div>
        <p className="tres-petit muet">{tr('La sauvegarde complète contient articles, ventes, clients, dépenses et journées de vente. Les codes PIN n’y figurent pas.')}</p>
      </div>

      <p className="section-titre">{tr('Cet appareil')}</p>
      <div className="carte pile">
        {s.estDemoActuel() ? (
          <button className="btn secondaire bloc" onClick={s.delierAppareil}>{tr('Quitter la démo')}</button>
        ) : (
          <button className="btn secondaire bloc" onClick={() => confirm(tr('Déconnecter cet appareil de « {0} » ? Pour le reconnecter, il faudra le code du commerce.', [d.commerce.nom])) && s.delierAppareil()}>{tr('Déconnecter cet appareil du commerce')}</button>
        )}
        {s.estDemoActuel() ? (
          <button className="btn danger bloc" onClick={() => confirm(tr('Remettre ce commerce de démo à zéro ?')) && s.reinitialiserDemo()}>{tr('Réinitialiser les données de démo')}</button>
        ) : (
          <button className="btn danger bloc" onClick={() => confirm(tr('Supprimer définitivement « {0} » et toutes ses ventes de cet appareil ?', [d.commerce.nom])) && s.supprimerCeCommerce()}>{tr('Supprimer ce commerce')}</button>
        )}
      </div>
    </div>
  );
}

/**
 * Position du commerce : par le GPS du téléphone, ou en cherchant l'adresse.
 * La carte vient d'OpenStreetMap (gratuit, sans clé).
 */
function Localisation({ b, setB }) {
  const s = useKaislo();
  const [recherche, setRecherche] = useState(false);
  const loc = b.localisation;

  const maPosition = () => {
    if (!navigator.geolocation) return s.message(tr('La localisation n’est pas disponible sur cet appareil'), 'erreur');
    setRecherche(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setRecherche(false);
        setB({ ...b, localisation: { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) } });
        s.message(tr('Position trouvée : pensez à enregistrer'));
      },
      () => {
        setRecherche(false);
        s.message(tr('Position refusée ou introuvable. Autorisez la localisation dans le navigateur.'), 'erreur');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Cherche l'adresse saisie (service gratuit OpenStreetMap "Nominatim")
  const chercherAdresse = async () => {
    const texte = [b.adresse, b.ville, paysParId(b.pays).nom].filter(Boolean).join(', ');
    if (!b.adresse && !b.ville) return s.message(tr('Renseignez d’abord l’adresse et la ville'), 'erreur');
    setRecherche(true);
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=' + encodeURIComponent(texte));
      const res = await r.json();
      if (!res.length) s.message(tr('Adresse introuvable sur la carte. Essayez avec moins de détails, ou utilisez votre position.'), 'erreur');
      else {
        setB({ ...b, localisation: { lat: Number(Number(res[0].lat).toFixed(6)), lng: Number(Number(res[0].lon).toFixed(6)) } });
        s.message(tr('Adresse trouvée : vérifiez la carte puis enregistrez'));
      }
    } catch {
      s.message(tr('Recherche impossible (pas de connexion ?)'), 'erreur');
    } finally {
      setRecherche(false);
    }
  };

  const majCoord = (champ) => (e) => {
    const v = parseFloat(String(e.target.value).replace(',', '.'));
    setB({ ...b, localisation: { lat: loc?.lat ?? 0, lng: loc?.lng ?? 0, [champ]: Number.isFinite(v) ? v : 0 } });
  };

  return (
    <div className="carte pile">
      {loc ? (
        <>
          <iframe
            className="carte-map"
            title={tr('Localisation du commerce')}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.006}%2C${loc.lat - 0.004}%2C${loc.lng + 0.006}%2C${loc.lat + 0.004}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`}
          />
          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <a className="btn secondaire petit" href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer">
              <Icone nom="lienExterne" taille="sm" /> {tr('Ouvrir dans Google Maps')}</a>
            <button className="btn fantome petit" onClick={() => setB({ ...b, localisation: null })}>{tr('Retirer')}</button>
          </div>
        </>
      ) : (
        <p className="petit muet">{tr('Placez votre commerce sur la carte : pratique pour les livraisons et pour que les clients vous trouvent.')}</p>
      )}
      <div className="grille-2">
        <button className="btn secondaire" onClick={maPosition} disabled={recherche}><Icone nom="cible" taille="sm" /> {tr('Ma position actuelle')}</button>
        <button className="btn secondaire" onClick={chercherAdresse} disabled={recherche}><Icone nom="carte" taille="sm" /> {tr('Chercher l’adresse')}</button>
      </div>
      <p className="tres-petit muet">{tr('« Ma position actuelle » : faites-le depuis le commerce. « Chercher l’adresse » utilise l’adresse et la ville ci-dessus.')}</p>
      <details>
        <summary className="petit muet" style={{ cursor: 'pointer' }}>{tr('Corriger les coordonnées à la main')}</summary>
        <div className="grille-2" style={{ marginTop: 10 }}>
          <label className="champ"><span>{tr('Latitude')}</span><input inputMode="decimal" value={loc?.lat ?? ''} onChange={majCoord('lat')} placeholder="33.5731" /></label>
          <label className="champ"><span>{tr('Longitude')}</span><input inputMode="decimal" value={loc?.lng ?? ''} onChange={majCoord('lng')} placeholder="-7.5898" /></label>
        </div>
      </details>
    </div>
  );
}

function ConfigTables() {
  const s = useKaislo();
  const [tables, setTables] = useState([...s.d.commerce.tables]);
  const enregistrer = () => {
    const err = s.enregistrerTables(tables);
    if (err) s.message(err, 'erreur');
  };
  return (
    <div className="pile">
      <p className="tres-petit muet">{tr('Les tables apparaissent dans l’écran Tables. Ajoutez aussi « À emporter » ou « Livraison » si besoin.')}</p>
      <div className="carte">
        {tables.map((t, i) => (
          <div key={i} className="ligne" style={{ marginTop: i ? 8 : 0 }}>
            <input className="saisie" value={t} onChange={(e) => setTables(tables.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="icone-btn danger" onClick={() => setTables(tables.filter((_, j) => j !== i))} aria-label={tr('Supprimer')}><Icone nom="poubelle" taille="sm" /></button>
          </div>
        ))}
        <button className="lien" style={{ marginTop: 12 }} onClick={() => setTables([...tables, 'Table ' + (tables.length + 1)])}>{tr('+ Ajouter une table')}</button>
      </div>
      <button className="btn bloc" onClick={enregistrer}>{tr('Enregistrer les tables')}</button>
    </div>
  );
}

// Connexion de l'imprimante, papier, aperçu (gérant et vendeurs)
export function BlocImprimante() {
  const s = useKaislo();
  const { d, imprimante, prefs } = s;
  const derniere = d.ventes[d.ventes.length - 1];
  return (
    <div className="grille-ecran deux">
      <div className="pile">
        <div className="carte">
          <div className="ligne etat-imprimante">
            <span className={`pastille ${imprimante.connectee ? 'ok' : ''}`}><Icone nom="bluetooth" /></span>
            <div className="grandit">
              <h3>{imprimante.connectee ? imprimante.nom : tr('Aucune imprimante connectée')}</h3>
              <p className="petit muet">{imprimante.connectee ? tr('Prête · les tickets s’impriment à chaque vente') : tr('Imprimante thermique Bluetooth 58 ou 80 mm')}</p>
            </div>
          </div>
          <div className="pile" style={{ marginTop: 16 }}>
            {!imprimante.connectee ? (
              <button className="btn bloc" onClick={s.connecterImprimante} disabled={!imprimante.disponible}><Icone nom="bluetooth" /> {tr('Connecter une imprimante')}</button>
            ) : (
              <div className="grille-2">
                <button className="btn" onClick={s.imprimerTest} disabled={s.impressionEnCours}>{tr('Ticket test')}</button>
                <button className="btn secondaire" onClick={s.deconnecterImprimante}>{tr('Déconnecter')}</button>
              </div>
            )}
            {!imprimante.disponible && (
              <p className="astuce">{tr('Ce navigateur ne permet pas le Bluetooth (iPhone, Safari, Firefox…). Le bouton')} <b>{tr('Imprimer')}</b> {tr('ouvre alors la fenêtre d’impression du téléphone : choisissez une imprimante de tickets compatible')} <b>{tr('AirPrint')}</b> {tr('(Wi-Fi), ou envoyez le ticket par WhatsApp. Pour une imprimante Bluetooth, utilisez')} <b>{tr('Chrome')}</b> {tr('sur Android ou sur ordinateur.')}</p>
            )}
          </div>
        </div>

        <div className="carte pile">
          <h3>{tr('Papier')}</h3>
          <Segment options={[[58, tr('58 mm')], [80, tr('80 mm')]]} valeur={prefs.largeurTicket} surChanger={(v) => s.sauverPrefs({ largeurTicket: v })} />
          <Reglage titre={tr('Imprimer les accents')} aide={tr('À désactiver si l’imprimante affiche des caractères bizarres.')} actif={prefs.accents} surChanger={(v) => s.sauverPrefs({ accents: v })} />
          <Reglage titre={tr('Imprimer automatiquement après chaque vente')} aide={tr('Sinon, le ticket s’imprime seulement si vous touchez « Imprimer ». L’impression est toujours facultative : chaque ticket reste dans les Ventes et peut être envoyé par WhatsApp.')} actif={prefs.impressionAuto !== false} surChanger={(v) => s.sauverPrefs({ impressionAuto: v })} />
        </div>

        <div className="carte petit pile">
          <h3>{tr('Première connexion')}</h3>
          <p><b>1.</b> {tr('Allumez l’imprimante et mettez du papier.')}</p>
          <p><b>2.</b> {tr('Activez le Bluetooth (et la localisation sur Android).')}</p>
          <p><b>3.</b> {tr('Touchez « Connecter une imprimante » et choisissez-la dans la liste.')}</p>
          <p className="muet">{tr('Inutile de l’appairer dans les réglages du téléphone.')}</p>
        </div>
      </div>
      <div>
        <p className="section-titre" style={{ marginTop: 0 }}>{tr('Aperçu du ticket')}</p>
        {derniere ? <ApercuTicket lignes={s.lignesVente(derniere)} largeur={prefs.largeurTicket} /> : <p className="muet petit">{tr('Faites une première vente pour voir l’aperçu.')}</p>}
      </div>
    </div>
  );
}
