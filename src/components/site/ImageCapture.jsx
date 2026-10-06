'use client';
// ------------------------------------------------------------
// Image d'une capture d'écran : la version en FCFA est écrite dans la page ; sur l'appareil du visiteur,
// elle est remplacée par la même capture dans la devise de son pays (position, voir lib/pays-visiteur.js).
// ------------------------------------------------------------
import { useSelectionPays } from '@/lib/pays-visiteur';
import { captureDevise } from '@/lib/captures-devise';
import { jeuDeTailles } from '@/lib/images-site';
import { chemin } from '@/config';

export default function ImageCapture({ src, alt, telephone, largeur, hauteur, priorite, tailles }) {
  const [pays] = useSelectionPays();
  const adresse = captureDevise(src, pays.devise);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={adresse} src={chemin(adresse)} srcSet={jeuDeTailles(adresse, { telephone })} sizes={telephone ? '300px' : tailles || '(min-width: 900px) 600px, 100vw'} alt={alt} width={largeur} height={hauteur} loading={priorite ? 'eager' : 'lazy'} fetchPriority={priorite ? 'high' : undefined} decoding="async" />
  );
}
