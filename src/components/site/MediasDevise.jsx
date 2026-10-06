'use client';
// ------------------------------------------------------------
// Vidéo de démonstration et vignette dans la devise du visiteur (voir lib/captures-devise.js) :
// la version en FCFA est écrite dans la page, remplacée sur l'appareil du visiteur selon son pays.
// ------------------------------------------------------------
import { useSelectionPays } from '@/lib/pays-visiteur';
import { captureDevise } from '@/lib/captures-devise';
import { jeuDeTailles, afficheVideo } from '@/lib/images-site';
import { chemin } from '@/config';

export function LecteurVideo({ src, poster, vertical, titre }) {
  const [pays] = useSelectionPays();
  const fichier = captureDevise(src, pays.devise);
  return <video key={fichier} src={chemin(fichier)} poster={chemin(afficheVideo(captureDevise(poster, pays.devise), vertical))} controls playsInline preload="none" width={vertical ? 780 : 1280} height={vertical ? 1560 : 720} aria-label={titre} />;
}

export function AfficheVignette({ poster, vertical }) {
  const [pays] = useSelectionPays();
  const adresse = captureDevise(poster, pays.devise);
  // eslint-disable-next-line @next/next/no-img-element
  return <img key={adresse} src={chemin(adresse)} srcSet={jeuDeTailles(adresse, { telephone: vertical })} sizes="(min-width: 900px) 240px, 45vw" alt="" loading="lazy" decoding="async" />;
}
