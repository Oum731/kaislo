// ------------------------------------------------------------
// Ancienne adresse /videos/ : redirige vers /tutoriels/
// (les liens déjà envoyés aux prospects continuent de marcher)
// ------------------------------------------------------------
import Link from 'next/link';
import { chemin } from '@/config';

export const metadata = {
  title: 'Tutoriels vidéo',
  robots: { index: false },
  alternates: { canonical: '/tutoriels/' },
};

export default function AncienneAdresseVideos() {
  return (
    <>
      <meta httpEquiv="refresh" content={'0; url=' + chemin('/tutoriels/')} />
      <p style={{ padding: 24 }}>Les vidéos ont déménagé : <Link href="/tutoriels/">voir les tutoriels</Link>.</p>
    </>
  );
}
