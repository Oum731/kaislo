import Link from 'next/link';
import { SITE } from '@/config';

export function Header() {
  return (
    <header className="hdr">
      <div className="wrap hdrin">
        <Link href="/" className="brand"><img src="/brand/logo.png" alt="" width="44" height="44" /><span><b>AICA</b><small>Ivoiriens de Casablanca</small></span></Link>
        <input type="checkbox" id="mn" className="mnt" aria-label="Menu" />
        <label htmlFor="mn" className="burger" aria-hidden>☰</label>
        <nav className="nav">
          <Link href="/evenements">Événements</Link>
          <Link href="/actions">Actions</Link>
          <Link href="/activites">Activités</Link>
          <Link href="/a-propos">L’association</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/adhesion" className="btn small">Ma carte de membre</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftrin">
        <div><b>{SITE.nomLong}</b><p>Unis par la culture, la solidarité et l’amitié, loin du pays mais jamais loin de chez nous.</p></div>
        <div><b>Liens</b><p><Link href="/evenements">Événements</Link><br /><Link href="/adhesion">Devenir membre</Link><br /><Link href="/contact">Nous écrire</Link></p></div>
        <div><b>Contact</b><p><a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />{SITE.ville}</p></div>
      </div>
      <p className="copy">© {new Date().getFullYear()} AICA · <Link href="/admin">Espace administration</Link></p>
    </footer>
  );
}

export function PostCard({ p, section }) {
  const d = p.event_date ? new Date(p.event_date) : null;
  return (
    <Link href={`/${section}/${p.slug}`} className="pcard">
      <div className="pimg">{p.has_image ? <img src={`/api/media/${p.id}`} alt="" loading="lazy" /> : <div className="ph"><img src="/brand/logo.png" alt="" /></div>}
        {d && p.type === 'event' && <span className="date"><b>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'Africa/Casablanca' }).format(d)}</b>{new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Africa/Casablanca' }).format(d).replace('.', '')}</span>}
      </div>
      <div className="pbody"><h3>{p.title}</h3>{p.location && <p className="loc">📍 {p.location}</p>}<p>{p.summary}</p><span className="more">Lire la suite →</span></div>
    </Link>
  );
}
