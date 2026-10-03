// ------------------------------------------------------------
// MENTIONS LÉGALES : éditeur, hébergeur, propriété intellectuelle
// Les informations viennent de src/config.js (SOCIETE, HEBERGEUR).
// ------------------------------------------------------------
import PageLegale, { Info } from '@/components/site/PageLegale';
import { SOCIETE, HEBERGEUR, CONTACT_EMAIL, CONTACT_WHATSAPP } from '@/config';

export const metadata = {
  title: 'Mentions légales',
  description: 'Éditeur et hébergeur du site Kaisly, propriété intellectuelle et contact.',
  alternates: { canonical: '/mentions-legales/' },
};

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
      <p>Le nom Kaisly, le logo, les textes, les captures et le code du site et de l’application sont la propriété de {SOCIETE.nom}. Toute reproduction sans autorisation écrite est interdite. Les noms et chiffres visibles dans les démos sont fictifs.</p>
    ),
  },
  {
    id: 'credits',
    titre: 'Crédits',
    contenu: <p>Cartes : © les contributeurs d’OpenStreetMap. Icônes et illustrations : {SOCIETE.nom}.</p>,
  },
];

export default function Page() {
  return (
    <PageLegale
      titre="Mentions légales"
      intro="Qui édite et qui héberge Kaisly."
      sections={SECTIONS}
    />
  );
}
