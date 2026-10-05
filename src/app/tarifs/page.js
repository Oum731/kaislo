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

export const metadata = metaPage({
  title: 'Tarifs par métier, dans la devise de votre pays',
  description: 'Tarifs Kaislo par métier, affichés dans la devise de votre pays : épicerie, boutique, maquis, restaurant, bar, quincaillerie, pharmacie, grossiste. 1 poste et 5 vendeurs inclus, premier mois gratuit, 2 mois offerts à l’année.',
  alternates: { canonical: '/tarifs/' },
});

const EXEMPLES = [
  ['Maquis', '4 serveurs, 1 imprimante au comptoir', 1],
  ['Restaurant', '8 serveurs : 5 en salle (poste « Salle »), 3 en terrasse (poste « Terrasse »)', 2],
  ['Épicerie', 'Le gérant + 2 vendeurs par roulement', 1],
  ['Grossiste', '2 postes au dépôt, 3 vendeurs chacune', 2],
];

const QUESTIONS = [
  ['Qu’est-ce qu’un poste ?', `C’est un point d’impression : le téléphone ou la tablette relié(e) à l’imprimante. Il accueille ${VENDEURS_PAR_POSTE} vendeurs au maximum, qui travaillent sur leur propre téléphone ; leurs tickets s’impriment tous sur l’imprimante du poste. Au-delà de ${VENDEURS_PAR_POSTE} vendeurs, il faut un poste de plus.`],
  ['Le gérant compte-t-il dans les vendeurs ?', 'Non. Le gérant peut vendre depuis n’importe quel poste et ne compte jamais dans la limite.'],
  ['Faut-il une imprimante ?', 'Non, l’impression est facultative : le ticket peut partir par WhatsApp ou rester dans l’historique. L’imprimante est vendue ou louée à part si vous en voulez une.'],
  ['Comment payer ?', 'Par mobile money (Wave, Orange Money, MTN MoMo…), virement, ou espèces auprès de l’équipe. Au mois, ou à l’année avec 2 mois offerts.'],
  ['Les prix sont-ils les mêmes partout ?', 'Non : les prix s’affichent dans la devise de votre pays, avec une grille adaptée à votre marché. Si le pays détecté n’est pas le vôtre, changez-le au-dessus du tableau.'],
];

export default function PageTarifs() {
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">Tarifs</span>
            <h1>Un prix simple, selon votre métier.</h1>
            <p className="chapo">Chaque formule comprend <b>1 poste avec jusqu’à {VENDEURS_PAR_POSTE} vendeurs</b>, plus le gérant. Premier mois gratuit, sans engagement.</p>
            <div className="ligne" style={{ gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Link href={LIEN_INSCRIPTION} className="btn grand">Essayer gratuitement 30 jours</Link>
              <Link href={LIEN_DEMO_RESTO} className="btn secondaire grand">Voir la démo</Link>
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
            <span className="etiquette">Postes et vendeurs</span>
            <h2>Au-delà de {VENDEURS_PAR_POSTE} vendeurs, un poste de plus.</h2>
            <div className="grille-pour-qui">
              <div className="pour-qui"><h3>Le gérant</h3><ul><li>Crée ses postes : « Comptoir », « Terrasse », « Comptoir 2 »…</li><li>Relie chaque poste à son imprimante</li><li>Crée ses vendeurs et les affecte à un poste</li><li>Vend depuis n’importe quel poste, sans compter dans la limite</li></ul></div>
              <div className="pour-qui"><h3>Le poste</h3><ul><li>Le téléphone ou la tablette relié(e) à l’imprimante</li><li>{VENDEURS_PAR_POSTE} vendeurs au maximum</li><li>En même temps ou par roulement</li><li>Toutes leurs commandes s’impriment sur son imprimante</li></ul></div>
              <div className="pour-qui"><h3>Le vendeur</h3><ul><li>Affecté à un seul poste à la fois</li><li>Le gérant le change de poste quand il veut</li><li>Travaille sur son propre téléphone, avec ses identifiants</li></ul></div>
            </div>
            <div className="tableau-tarifs" style={{ marginTop: 24 }}>
              <table>
                <thead><tr><th>Commerce</th><th>Organisation</th><th>Postes</th></tr></thead>
                <tbody>{EXEMPLES.map(([c, o, p]) => <tr key={c}><td><b>{c}</b></td><td>{o}</td><td><b>{p}</b></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-largeur">
            <span className="etiquette">Questions fréquentes</span>
            <h2>Tout savoir sur les tarifs.</h2>
            <Faq questions={QUESTIONS} />
            <p className="petit" style={{ marginTop: 18 }}>Vous voulez vendre Kaislo autour de vous ? <Link href="/devenir-commercial/" className="lien">Devenez commercial Kaislo →</Link></p>
          </div>
        </section>
        <AppelFinal titre="Essayez Kaislo gratuitement pendant 30 jours." texte="Catégories et unités de votre métier déjà prêtes. Sans engagement, sans carte bancaire." lienDemo={LIEN_DEMO_RESTO} />
      </main>
      <PiedSite />
    </div>
  );
}
