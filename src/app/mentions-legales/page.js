// ------------------------------------------------------------
// MENTIONS LÉGALES : éditeur, hébergeur, propriété intellectuelle
// Les informations viennent de src/config.js (SOCIETE, HEBERGEUR).
// ------------------------------------------------------------
import PageLegale, { Info } from '@/components/site/PageLegale';
import { SOCIETE, HEBERGEUR, CONTACT_EMAIL, CONTACT_WHATSAPP } from '@/config';
import CREDITS_PHOTOS from '@/lib/donnees/credits-photos.json';
import { metaPage } from '@/lib/seo';

// Licences Creative Commons des photos (obligatoire : nom de l'auteur + lien vers la licence)
const nomLicence = (c) => (c.licence === 'cc0' ? 'CC0 (domaine public)' : c.licence === 'pdm' ? 'Domaine public' : 'CC ' + c.licence.toUpperCase() + ' ' + c.version);
const lienLicence = (c) => (c.licence === 'cc0' ? 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr'
  : c.licence === 'pdm' ? 'https://creativecommons.org/publicdomain/mark/1.0/deed.fr'
  : `https://creativecommons.org/licenses/${c.licence}/${c.version || '4.0'}/deed.fr`);

export const metadata = metaPage({
  title: 'Mentions légales',
  description: 'Éditeur et hébergeur du site Kaislo, propriété intellectuelle et contact.',
  alternates: { canonical: '/mentions-legales/' },
});

const SECTIONS = [
  {
    id: 'editeur',
    titre: 'Éditeur',
    contenu: (
      <ul>
        <Info libelle="Société" valeur={SOCIETE.nom} />
        <Info libelle="Forme juridique" valeur={SOCIETE.formeJuridique} />
        <Info libelle="Siège" valeur={SOCIETE.adresse} />
        <Info libelle="Immatriculation" valeur={SOCIETE.immatriculation} />
        <Info libelle="Responsable de la publication" valeur={SOCIETE.directeurPublication} />
        <li><b>E-mail :</b> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
        <li><b>WhatsApp :</b> <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noreferrer">+{CONTACT_WHATSAPP}</a></li>
      </ul>
    ),
  },
  {
    id: 'hebergeur',
    titre: 'Hébergeur',
    contenu: (
      <ul>
        <Info libelle="Nom" valeur={HEBERGEUR.nom} />
        <Info libelle="Adresse" valeur={HEBERGEUR.adresse} />
        {HEBERGEUR.site && <li><b>Site :</b> <a href={HEBERGEUR.site} target="_blank" rel="noreferrer">{HEBERGEUR.site}</a></li>}
      </ul>
    ),
  },
  {
    id: 'propriete',
    titre: 'Propriété intellectuelle',
    contenu: (
      <p>Le nom Kaislo, le logo, les textes, les captures et le code du site et de l’application sont la propriété de {SOCIETE.nom}. Toute reproduction sans autorisation écrite est interdite. Les noms et chiffres visibles dans les démos sont fictifs.</p>
    ),
  },
  {
    id: 'credits',
    titre: 'Crédits',
    contenu: (
      <>
        <p>Cartes : © les contributeurs d’OpenStreetMap. Icônes et illustrations : {SOCIETE.nom}.</p>
        <p>Photos des articles des démos : images sous licence libre (Creative Commons), trouvées avec Openverse, recadrées et réduites.</p>
        <details>
          <summary>Voir le détail des {Object.keys(CREDITS_PHOTOS).length} photos</summary>
          <ul>
            {Object.entries(CREDITS_PHOTOS).map(([cle, c]) => (
              <li key={cle}>
                <b>{cle.replace(/-/g, ' ')}</b> : « {c.titre} », {c.auteur} —{' '}
                <a href={lienLicence(c)} target="_blank" rel="noreferrer">{nomLicence(c)}</a> —{' '}
                <a href={c.source} target="_blank" rel="noreferrer">source</a>
              </li>
            ))}
          </ul>
        </details>
      </>
    ),
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Mentions légales"
      intro="Qui édite et qui héberge Kaislo."
      sections={SECTIONS}
    />
  );
}
