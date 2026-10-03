// ------------------------------------------------------------
// PAGE « TARIFS » : une formule par métier, 1 poste et 5 vendeurs inclus,
// postes supplémentaires, règles communes, organisation en postes (exemples).
// Les prix viennent de src/lib/donnees/tarifs.js (même grille que le serveur).
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, Faq, AppelFinal, LIEN_DEMO_RESTO, LIEN_INSCRIPTION } from '@/components/site/Site';
import { FORMULES, REGLES_TARIFS, VENDEURS_PAR_POSTE } from '@/lib/donnees/tarifs';
import { typeCommerce } from '@/lib/donnees/modeles';

export const metadata = {
  title: 'Tarifs — caisse et gestion de stock par métier',
  description: 'Tarifs Kaislo par métier, au Maroc (DH) et en Afrique de l’Ouest (FCFA) : épicerie, boutique, maquis, restaurant, bar, quincaillerie, pharmacie, grossiste. 1 poste et 5 vendeurs inclus, premier mois gratuit, 2 mois offerts à l’année.',
  alternates: { canonical: '/tarifs/' },
};

const nombre = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const FAMILLES = [...new Set(FORMULES.map((f) => f.famille))];

const EXEMPLES = [
  ['Maquis', '4 serveurs, 1 imprimante au comptoir', 1],
  ['Restaurant', '8 serveurs : 5 en salle (poste « Salle »), 3 en terrasse (poste « Terrasse »)', 2],
  ['Épicerie', 'Le gérant + 2 vendeurs par roulement', 1],
  ['Grossiste', '2 caisses au dépôt, 3 vendeurs chacune', 2],
];

const QUESTIONS = [
  ['Qu’est-ce qu’un poste ?', `C’est un point d’impression : le téléphone ou la tablette relié(e) à l’imprimante. Il accueille ${VENDEURS_PAR_POSTE} vendeurs au maximum, qui travaillent sur leur propre téléphone ; leurs tickets s’impriment tous sur l’imprimante du poste. Au-delà de ${VENDEURS_PAR_POSTE} vendeurs, il faut un poste de plus.`],
  ['Le gérant compte-t-il dans les vendeurs ?', 'Non. Le gérant peut vendre depuis n’importe quel poste et ne compte jamais dans la limite.'],
  ['Faut-il une imprimante ?', 'Non, l’impression est facultative : le ticket peut partir par WhatsApp ou rester dans l’historique. L’imprimante est vendue ou louée à part si vous en voulez une.'],
  ['Comment payer ?', 'Par mobile money (Wave, Orange Money, MTN MoMo…), virement, ou espèces auprès de l’équipe. Au mois, ou à l’année avec 2 mois offerts.'],
  ['Et dans les autres pays ?', 'Les prix sont aussi disponibles en euros, en dollars et dans les autres devises : écrivez-nous avec la bulle « Discuter avec nous ».'],
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
            {FAMILLES.map((famille) => {
              const formules = FORMULES.filter((f) => f.famille === famille);
              return (
                <div key={famille}>
                  <h2 style={{ fontSize: 24 }}>{famille}</h2>
                  <div className="tableau-tarifs">
                    <table>
                      <thead><tr><th>Métier</th><th>Maroc / mois</th><th>Côte d’Ivoire, Sénégal / mois</th></tr></thead>
                      <tbody>
                        {formules.flatMap((f) => f.types.filter((t) => t !== 'autre').map((t) => (
                          <tr key={t}><td>{typeCommerce(t).nom}</td><td><b>{nombre(f.prix.MAD)} DH</b></td><td><b>{nombre(f.prix.FCFA)} FCFA</b></td></tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                  <p className="petit muet" style={{ marginTop: 8 }}>Poste supplémentaire : +{nombre(formules[0].prixPoste.MAD)} DH ou +{nombre(formules[0].prixPoste.FCFA)} FCFA par mois.</p>
                </div>
              );
            })}
            <div className="carte pile">
              <h3>Pour toutes les formules</h3>
              <ul className="liste-points">
                <li><b>Paiement annuel : {REGLES_TARIFS.moisOffertsAnnuel} mois offerts.</b></li>
                <li><b>Premier mois gratuit</b> et <b>installation offerte</b> pendant le lancement.</li>
                <li><b>Tarif fondateur</b> : remise de {REGLES_TARIFS.remiseFondateur} % à vie pour les {REGLES_TARIFS.placesFondateur} premiers clients.</li>
                <li>Matériel à part : imprimante vendue ou louée (facultative).</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Postes et vendeurs</span>
            <h2>Au-delà de {VENDEURS_PAR_POSTE} vendeurs, un poste de plus.</h2>
            <div className="grille-pour-qui">
              <div className="pour-qui"><h3>Le gérant</h3><ul><li>Crée ses postes : « Comptoir », « Terrasse », « Caisse 2 »…</li><li>Relie chaque poste à son imprimante</li><li>Crée ses vendeurs et les affecte à un poste</li><li>Vend depuis n’importe quel poste, sans compter dans la limite</li></ul></div>
              <div className="pour-qui"><h3>Le poste</h3><ul><li>Le téléphone ou la tablette relié(e) à l’imprimante</li><li>{VENDEURS_PAR_POSTE} vendeurs au maximum</li><li>En même temps ou par roulement</li><li>Toutes leurs commandes s’impriment sur son imprimante</li></ul></div>
              <div className="pour-qui"><h3>Le vendeur</h3><ul><li>Affecté à un seul poste à la fois</li><li>Le gérant le change de poste quand il veut</li><li>Travaille sur son propre téléphone, avec ses identifiants</li></ul></div>
            </div>
            <div className="tableau-tarifs" style={{ marginTop: 24 }}>
              <table>
                <thead><tr><th>Commerce</th><th>Organisation</th><th>Postes</th></tr></thead>
                <tbody>{EXEMPLES.map(([c, o, p]) => <tr key={c}><td><b>{c}</b></td><td>{o}</td><td><b>{p}</b></td></tr>)}</tbody>
              </table>
            </div>
            <p className="petit muet" style={{ marginTop: 10 }}>Exemple : un restaurant à Abidjan avec 2 postes paie {nombre(FORMULES.find((f) => f.id === 'restaurant').prix.FCFA)} + {nombre(FORMULES.find((f) => f.id === 'restaurant').prixPoste.FCFA)} = {nombre(FORMULES.find((f) => f.id === 'restaurant').prix.FCFA + FORMULES.find((f) => f.id === 'restaurant').prixPoste.FCFA)} FCFA par mois.</p>
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
