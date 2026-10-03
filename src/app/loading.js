// Affiché par Next pendant le passage d'une page à l'autre (le temps de charger la suivante)
import Chargement from '@/components/Chargement';

export default function ChargementPage() {
  return <Chargement plein={false} />;
}
