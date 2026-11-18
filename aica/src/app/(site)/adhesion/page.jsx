import MemberForm from '@/components/MemberForm';

export const metadata = { title: 'Devenir membre — obtenir ma carte', description: 'Remplissez le formulaire : votre carte de membre AICA est générée automatiquement.' };

export default function Adhesion() {
  return (
    <div className="wrap page">
      <h1>Ma carte de membre</h1>
      <p className="lead dark">Trois étapes rapides. Votre carte est créée automatiquement et téléchargeable tout de suite en PDF.</p>
      <MemberForm />
    </div>
  );
}
