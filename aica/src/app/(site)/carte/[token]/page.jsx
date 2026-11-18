import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import CardView from '@/components/CardView';
import { membreParToken } from '@/lib/members';
import { urlVerification } from '@/lib/card-pdf';
import { SITE } from '@/config';
import { dbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ma carte de membre', robots: { index: false } };

export default async function Carte({ params }) {
  const { token } = await params;
  if (!dbConfigured() || !/^[0-9a-f]{32}$/.test(token)) notFound();
  const m = await membreParToken(token);
  if (!m) notFound();
  const qr = await QRCode.toDataURL(urlVerification(m.number), { margin: 1, width: 300 });
  const lien = `${SITE.url}/carte/${token}`;
  const wa = `https://wa.me/?text=${encodeURIComponent('Ma carte de membre AICA : ' + lien)}`;
  return (
    <div className="wrap page narrow center">
      <p className="ok banner">🎉 Bienvenue {m.prenoms.split(' ')[0]} ! Votre carte <b>{m.number}</b> est prête.</p>
      {m.status !== 'active' && <p className="err banner">Cette carte n’est plus active.</p>}
      <div className="cardpair">
        <CardView m={m} photoUrl={`/api/carte/${token}/photo`} />
        <CardView m={m} side="back" qr={qr} />
      </div>
      <div className="cta c">
        <a className="btn big" href={`/api/carte/${token}?telecharger`}>⬇ Télécharger le PDF</a>
        <a className="btn big ghost" href={wa} target="_blank" rel="noopener noreferrer">Partager sur WhatsApp</a>
      </div>
      <p className="hint">Conservez cette page : <b>l’adresse de cette page est personnelle</b>, elle vous permet de retrouver votre carte à tout moment. Une copie est aussi enregistrée par l’association.</p>
      <Link href="/" className="back">← Retour au site</Link>
    </div>
  );
}
