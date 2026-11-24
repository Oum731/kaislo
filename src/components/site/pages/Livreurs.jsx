// ------------------------------------------------------------
// PAGE « LIVREURS » (kaislo.com/livreurs/) : la livraison par des livreurs Kaislo n'est pas encore ouverte.
// On recueille l'intérêt par WhatsApp ; aucun compte livreur n'existe encore.
// ------------------------------------------------------------
import Link from 'next/link';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';
import { CONTACT_WHATSAPP, CONTACT_EMAIL } from '@/config';
import { EnTeteDecouverte, PiedSite } from '@/components/site/Site';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Devenir livreur Kaislo'),
    description: tr('La livraison Kaislo arrive bientôt. Dites-nous que vous êtes intéressé : nous vous contactons à l’ouverture dans votre ville.'),
    alternates: alternates('/livreurs/', lang),
    langue: lang,
  });
}

export default function Livreurs({ lang }) {
  choisirLangue(lang);
  const message = encodeURIComponent(tr('Bonjour, je veux devenir livreur Kaislo. Ma ville :'));
  return (
    <div className="site">
      <EnTeteDecouverte lang={lang} />
      <main>
        <section className="section decouverte-section">
          <div className="site-largeur" style={{ maxWidth: 680 }}>
            <h1 className="decouverte-titre">{tr('Devenir livreur Kaislo')}</h1>
            <p className="chapo">{tr('Les commerçants Kaislo vont proposer la livraison à leurs clients. L’ouverture des livreurs n’a pas encore commencé : dites-nous que vous êtes intéressé et nous vous contactons dès que ce sera possible dans votre ville.')}</p>
            <p className="boutons">
              <a className="btn grand" href={`https://wa.me/${CONTACT_WHATSAPP}?text=${message}`} target="_blank" rel="noreferrer">{tr('Nous écrire sur WhatsApp')}</a>
              <a className="btn secondaire grand" href={`mailto:${CONTACT_EMAIL}`}>{tr('Nous écrire par e-mail')}</a>
            </p>
            <p className="petit muet">{tr('Indiquez votre nom, votre ville et votre moyen de transport (moto, vélo, voiture…).')}</p>
            <p><Link href={lien('/')}>{tr('← Retour aux boutiques')}</Link></p>
          </div>
        </section>
      </main>
      <PiedSite cote="client" />
    </div>
  );
}
