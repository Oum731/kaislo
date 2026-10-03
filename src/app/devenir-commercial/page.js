// ------------------------------------------------------------
// PAGE « DEVENIR COMMERCIAL KAISLO » : recrutement des commerciaux
// (règles du programme, exemple chiffré, contact WhatsApp).
// ------------------------------------------------------------
import Link from 'next/link';
import { EnTeteSite, PiedSite, Faq } from '@/components/site/Site';
import { FORMULES } from '@/lib/donnees/tarifs';
import { CONTACT_WHATSAPP } from '@/config';

export const metadata = {
  title: 'Devenir commercial Kaislo',
  description: 'Présentez Kaislo aux commerçants de votre ville et touchez 25 % de leurs abonnements pendant 12 mois. Code parrain, espace personnel, versements par mobile money.',
  alternates: { canonical: '/devenir-commercial/' },
};

const nombre = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const resto = FORMULES.find((f) => f.id === 'restaurant');
const mensuel = resto.prix.FCFA + resto.prixPoste.FCFA;
const commission = mensuel * 0.25;

const QUESTIONS = [
  ['Faut-il être salarié ?', 'Non. Vous êtes indépendant : auto-entrepreneur au Maroc, statut d’entreprenant en Côte d’Ivoire et au Sénégal. Un accord écrit simple précise les règles et le calendrier de paiement.'],
  ['Comment mes clients sont-ils reliés à moi ?', 'Chaque commercial reçoit un code parrain. Le commerçant le saisit à la création de son compte, ou s’inscrit avec votre lien personnel : le code est alors rempli tout seul.'],
  ['Quand suis-je payé ?', 'Au 6e mois payé par le client, s’il a enregistré des ventes au moins chaque semaine : vous recevez d’un coup les commissions des mois 1 à 6. Ensuite, du 7e au 12e mois, chaque mois. Versements par mobile money ou virement.'],
  ['Et si le client arrête ?', 'Si le client arrête avant 6 mois, aucune commission n’est due. C’est pourquoi nous vous encourageons à accompagner vos clients au démarrage.'],
  ['Où suivre mes commissions ?', 'Dans votre espace commercial : vos clients, leur ancienneté, et vos commissions en attente, à recevoir et déjà reçues.'],
];

export default function PageDevenirCommercial() {
  const lienWhatsApp = 'https://wa.me/' + CONTACT_WHATSAPP + '?text=' + encodeURIComponent('Bonjour, je souhaite devenir commercial Kaislo.');
  return (
    <div className="site">
      <EnTeteSite />
      <main>
        <section className="tutos-tete">
          <div className="site-largeur">
            <span className="etiquette">Programme commercial</span>
            <h1>Présentez Kaislo, touchez 25 % pendant 12 mois.</h1>
            <p className="chapo">Vous connaissez les commerçants de votre quartier ? Faites-leur découvrir la caisse et la gestion de stock Kaislo, et touchez <b>25 % de tout ce qu’ils paient</b> pendant leurs 12 premiers mois.</p>
            <div className="ligne" style={{ gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <a href={lienWhatsApp} className="btn grand" target="_blank" rel="noreferrer">Je veux devenir commercial</a>
              <Link href="/commercial/" className="btn secondaire grand">Espace commercial</Link>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="site-largeur">
            <div className="grille-pour-qui">
              <div className="pour-qui"><h3>1. Votre code parrain</h3><ul><li>Un code personnel et un lien à partager</li><li>Saisi à la création du compte du commerce</li></ul></div>
              <div className="pour-qui"><h3>2. Vos clients s’abonnent</h3><ul><li>30 jours d’essai gratuit</li><li>Puis l’abonnement de leur métier</li></ul></div>
              <div className="pour-qui"><h3>3. Vous êtes payé</h3><ul><li>25 % pendant 12 mois, postes compris</li><li>Mois 1 à 6 versés d’un coup au 6e mois</li><li>Puis chaque mois</li></ul></div>
            </div>
            <div className="carte pile" style={{ marginTop: 24 }}>
              <h3>Exemple chiffré</h3>
              <p>Un restaurant à Abidjan avec 2 postes paie {nombre(resto.prix.FCFA)} + {nombre(resto.prixPoste.FCFA)} = <b>{nombre(mensuel)} FCFA par mois</b>.</p>
              <ul className="liste-points">
                <li>Votre commission : 25 % = <b>{nombre(commission)} FCFA par mois</b>.</li>
                <li>Au 6e mois : 6 × {nombre(commission)} = <b>{nombre(commission * 6)} FCFA</b> versés d’un coup.</li>
                <li>Du 7e au 12e mois : {nombre(commission)} FCFA par mois.</li>
                <li>Total sur un an : <b>{nombre(commission * 12)} FCFA</b> pour un seul client.</li>
              </ul>
              <p className="petit muet">Primes en plus à 10 et à 25 clients validés.</p>
            </div>
          </div>
        </section>
        <section className="section claire">
          <div className="site-largeur">
            <span className="etiquette">Questions fréquentes</span>
            <h2>Le programme en détail.</h2>
            <Faq questions={QUESTIONS} />
          </div>
        </section>
      </main>
      <PiedSite />
    </div>
  );
}
