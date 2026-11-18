import Link from 'next/link';
import { exigerAdmin } from '@/lib/auth';
import { logout } from '../actions';

export const metadata = { title: 'Administration', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  await exigerAdmin();
  return (
    <div className="adm">
      <aside className="admside">
        <Link href="/admin" className="brand"><img src="/brand/logo.png" alt="" width="40" height="40" /><span><b>AICA</b><small>Administration</small></span></Link>
        <nav>
          <Link href="/admin">📊 Tableau de bord</Link>
          <Link href="/admin/membres">🪪 Membres & cartes</Link>
          <Link href="/admin/contenus?type=event">📅 Événements</Link>
          <Link href="/admin/contenus?type=action">🤝 Actions</Link>
          <Link href="/admin/contenus?type=activity">⚽ Activités</Link>
          <Link href="/admin/messages">✉️ Messages</Link>
          <Link href="/" target="_blank">🌐 Voir le site</Link>
        </nav>
        <form action={logout}><button className="btn ghost small">Se déconnecter</button></form>
      </aside>
      <section className="admmain">{children}</section>
    </div>
  );
}
