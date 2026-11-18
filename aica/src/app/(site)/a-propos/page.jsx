import Link from 'next/link';

export const metadata = { title: 'L’association', description: 'Qui sommes-nous ? Mission et valeurs de l’Association des Ivoiriens de Casablanca.' };

export default function APropos() {
  return (
    <div className="wrap page narrow">
      <h1>L’association</h1>
      <p className="lead dark">L’Association des Ivoiriens de Casablanca (AICA) rassemble les Ivoiriennes et Ivoiriens vivant à Casablanca : étudiants, familles, professionnels et sportifs.</p>
      <div className="prose">
        <h2>Notre mission</h2>
        <p>Créer du lien entre les Ivoiriens de Casablanca, accueillir et accompagner les nouveaux arrivants, et faire rayonner la culture ivoirienne au Maroc.</p>
        <h2>Nos valeurs</h2>
        <ul><li><b>Solidarité</b> : être présents les uns pour les autres, dans les bons moments comme dans les difficultés.</li><li><b>Fraternité</b> : cultiver l’amitié entre Ivoiriens et avec le peuple marocain.</li><li><b>Culture</b> : célébrer nos traditions, notre musique, notre cuisine, notre sport.</li></ul>
        <h2>La carte de membre</h2>
        <p>La carte AICA est strictement personnelle. Elle comporte un QR code qui permet à tout responsable de vérifier en un instant qu’elle est authentique et en cours de validité.</p>
      </div>
      <Link className="btn" href="/adhesion">Obtenir ma carte</Link>
    </div>
  );
}
