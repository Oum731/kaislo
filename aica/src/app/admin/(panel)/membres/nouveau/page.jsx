import MemberForm from '@/components/MemberForm';

export default function Nouveau() {
  return (<><h1>Nouvelle carte de membre</h1><p className="hint">Pour inscrire un membre à sa place (même formulaire que sur le site, avec le choix de la fonction).</p><MemberForm admin /></>);
}
