// ------------------------------------------------------------
// PAGE « TARIFS » : une formule par métier, 1 poste et 5 vendeurs inclus,
// postes supplémentaires, règles communes, organisation en postes (exemples).
// Les prix viennent de src/lib/donnees/tarifs.js (même grille que le serveur).
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, Faq, AppelFinal, LIEN_DEMO_RESTO, LIEN_INSCRIPTION } from '@/components/site/Site';
import { VENDEURS_PAR_POSTE } from '@/lib/donnees/tarifs';
import TarifsPays from '@/components/site/TarifsPays';
import { metaPage } from '@/lib/seo';
import { tr, choisirLangue } from '@/lib/i18n';
import { alternates, lien } from '@/lib/site-routes';

export function meta(lang) {
  choisirLangue(lang);
  return metaPage({
    title: tr('Tarifs par métier, dans la devise de votre pays'),
    description: tr('Tarifs Kaislo par métier, affichés dans la devise de votre pays : épicerie, boutique, maquis, restaurant, bar, quincaillerie, pharmacie, grossiste. 1 poste et 5 vendeurs inclus, premier mois gratuit, 2 mois offerts à l’année.'),
    alternates: alternates('/tarifs/', lang),
    langue: lang,
  });
}

const EXEMPLES = () => ([
  ['Maquis', '4 serveurs, 1 imprimante au comptoir', 1],
  ['Restaurant', '8 serveurs : 5 en salle (poste « Salle »), 3 en terrasse (poste « Terrasse »)', 2],
  ['Épicerie', tr('Le gérant + 2 vendeurs par roulement'), 1],
  ['Grossiste', tr('2 postes au dépôt, 3 vendeurs chacune'), 2],
]);

const QUESTIONS = () => ([
  [tr('Qu’est-ce qu’un poste ?'), `C’est un point d’impression : le téléphone ou la tablette relié(e) à l’imprimante. Il accueille ${VENDEURS_PAR_POSTE} vendeurs au maximum, qui travaillent sur leur propre téléphone ; leurs tickets s’impriment tous sur l’imprimante du poste. Au-delà de ${VENDEURS_PAR_POSTE} vendeurs, il faut un poste de plus.`],
  [tr('Le gérant compte-t-il dans les vendeurs ?'), tr('Non. Le gérant peut vendre depuis n’importe quel poste et ne compte jamais dans la limite.')],
  [tr('Faut-il une imprimante ?'), tr('Non, l’impression est facultative : le ticket peut partir par WhatsApp ou rester dans l’historique. L’imprimante est vendue ou louée à part si vous en voulez une.')],
  [tr('Comment fonctionne le code parrain ?'), tr('Un commercial Kaislo vous a présenté l’application et vous a donné son code ? Saisissez-le à la création de votre compte : vous payez le prix de la colonne « Avec un code parrain », soit environ 10 % de moins que le prix catalogue. Le code se saisit une seule fois, à l’inscription.')],
  [tr('Comment payer ?'), tr('Par mobile money (Wave, Orange Money, MTN MoMo…), virement, ou espèces auprès de l’équipe. Au mois, ou à l’année avec 2 mois offerts.')],
  [tr('Les prix sont-ils les mêmes partout ?'), tr('Non : les prix s’affichent dans la devise de votre pays, avec une grille adaptée à votre marché. Si le pays détecté n’est pas le vôtre, changez-le au-dessus du tableau.')],
]);

export default function Tarifs({ lang }) {
  choisirLangue(lang);
  return (
    <div className="site">
      <EnTeteSite lang={lang} />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">{tr('Tarifs')}</span>
            <h1>{tr('Un prix simple, selon votre métier.')}</h1>
            <p className="chapo">{tr('Chaque formule comprend')} <b>{tr('1 poste avec jusqu’à {0} vendeurs', [VENDEURS_PAR_POSTE])}</b>{tr(', plus le gérant. Premier mois gratuit, sans engagement.')}</p>
            <div className="ligne" style={{ gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Link href={LIEN_INSCRIPTION} className="btn grand">{tr('Essayer gratuitement 30 jours')}</Link>
              <Link href={LIEN_DEMO_RESTO} className="btn secondaire grand">{tr('Voir la démo')}</Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-largeur pile" style={{ gap: 28 }}>
            <TarifsPays />
          </div>
        </section>

        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">{tr('Postes et vendeurs')}</span>
            <h2>{tr('Au-delà de {0} vendeurs, un poste de plus.', [VENDEURS_PAR_POSTE])}</h2>
            <div className="grille-pour-qui">
              <div className="pour-qui"><h3>{tr('Le gérant')}</h3><ul><li>{tr('Crée ses postes : « Comptoir », « Terrasse », « Comptoir 2 »…')}</li><li>{tr('Relie chaque poste à son imprimante')}</li><li>{tr('Crée ses vendeurs et les affecte à un poste')}</li><li>{tr('Vend depuis n’importe quel poste, sans compter dans la limite')}</li></ul></div>
              <div className="pour-qui"><h3>{tr('Le poste')}</h3><ul><li>{tr('Le téléphone ou la tablette relié(e) à l’imprimante')}</li><li>{tr('{0} vendeurs au maximum', [VENDEURS_PAR_POSTE])}</li><li>{tr('En même temps ou par roulement')}</li><li>{tr('Toutes leurs commandes s’impriment sur son imprimante')}</li></ul></div>
              <div className="pour-qui"><h3>{tr('Le vendeur')}</h3><ul><li>{tr('Affecté à un seul poste à la fois')}</li><li>{tr('Le gérant le change de poste quand il veut')}</li><li>{tr('Travaille sur son propre téléphone, avec ses identifiants')}</li></ul></div>
            </div>
            <div className="tableau-tarifs" style={{ marginTop: 24 }}>
              <table>
                <thead><tr><th>{tr('Commerce')}</th><th>{tr('Organisation')}</th><th>{tr('Postes')}</th></tr></thead>
                <tbody>{EXEMPLES().map(([c, o, p]) => <tr key={c}><td><b>{c}</b></td><td>{o}</td><td><b>{p}</b></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">{tr('Questions fréquentes')}</span>
            <h2>{tr('Tout savoir sur les tarifs.')}</h2>
            <Faq questions={QUESTIONS()} />
            <p className="petit" style={{ marginTop: 18 }}>{tr('Vous voulez vendre Kaislo autour de vous ?')} <Link href="/devenir-commercial/" className="lien">{tr('Devenez commercial Kaislo →')}</Link></p>
          </div>
        </section>
        <AppelFinal titre={tr('Essayez Kaislo gratuitement pendant 30 jours.')} texte={tr('Catégories et unités de votre métier déjà prêtes. Sans engagement, sans carte bancaire.')} lienDemo={LIEN_DEMO_RESTO} />
      </main>
      <PiedSite />
    </div>
  );
}
