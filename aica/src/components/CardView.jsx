import { W, H, FLAG_CI, FLAG_MA, PHOTO, BADGE, STAMP, LOGO, QR, BG_CSS, frontTexts, backTexts } from '@/lib/card-layout';

const px = (v, t) => `${(v / t) * 100}%`;
const box = (b) => ({ left: px(b.x, W), top: px(b.y, H), width: px(b.w, W), height: px(b.h, H) });

function Texte({ it }) {
  const s = { top: px(it.y, H), fontSize: `${(it.size / W) * 100}cqw`, color: it.color, fontWeight: it.bold ? 700 : 400, fontStyle: it.italic ? 'italic' : 'normal' };
  if (it.align === 'center') { s.left = px(it.x, W); s.transform = 'translateX(-50%)'; }
  else if (it.align === 'right') s.right = px(W - it.x, W);
  else s.left = px(it.x, W);
  return <span className="ct" style={s}>{it.t}</span>;
}

// Aperçu à l'écran de la carte (même mise en page que le PDF). `qr` = data-URL du QR (verso), optionnel.
export default function CardView({ m, photoUrl, side = 'front', qr }) {
  return (
    <div className="card" style={{ background: BG_CSS }} aria-label={side === 'front' ? 'Carte de membre, recto' : 'Carte de membre, verso'}>
      {side === 'front' ? (
        <>
          <img className="ci" src="/brand/ci.svg" alt="" style={box(FLAG_CI)} />
          <img className="ci" src="/brand/ma.png" alt="" style={box(FLAG_MA)} />
          <div className="cphoto" style={box(PHOTO)}>{photoUrl ? <img src={photoUrl} alt="Photo du membre" /> : <span>Photo</span>}</div>
          <div className="cbadge" style={box(BADGE)} />
          <img className="ci" src="/brand/cachet.png" alt="" style={{ ...box(STAMP), height: 'auto' }} />
          {frontTexts(m).map((it, i) => <Texte key={i} it={it} />)}
        </>
      ) : (
        <>
          <img className="ci" src="/brand/logo.png" alt="" style={box(LOGO)} />
          <div className="cqr" style={{ ...box(QR), left: px(QR.x - 3, W), top: px(QR.y - 3, H), width: px(QR.w + 6, W), height: px(QR.h + 6, H) }}>{qr && <img src={qr} alt="QR code de vérification" />}</div>
          {backTexts().map((it, i) => <Texte key={i} it={it} />)}
        </>
      )}
    </div>
  );
}
