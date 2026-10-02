// ------------------------------------------------------------
// Génère les icônes PNG de l'application (sans aucune dépendance).
// Lancer : npm run icones
// ------------------------------------------------------------
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const VERT = [30, 91, 67], CREME = [246, 244, 238], SAFRAN = [233, 162, 59];

// Distance d'un point à un segment
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Couleur d'un point (coordonnées sur 512), "echelle" < 1 = dessin réduit (icône maskable)
function couleur(x, y, echelle, arrondi) {
  if (arrondi) {
    const r = 112, cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r);
    if (Math.hypot(x - cx, y - cy) > r) return null; // transparent hors du carré arrondi
  }
  const u = 256 + (x - 256) / echelle, v = 256 + (y - 256) / echelle;
  if (Math.hypot(u - 382, v - 134) < 40) return SAFRAN;
  const k =
    distSegment(u, v, 186, 140, 186, 372) < 30 ||
    distSegment(u, v, 200, 268, 318, 148) < 30 ||
    distSegment(u, v, 240, 240, 334, 372) < 30;
  return k ? CREME : VERT;
}

function png(taille, echelle, arrondi) {
  const lignes = [];
  const N = 4; // sur-échantillonnage pour des bords lisses
  for (let y = 0; y < taille; y++) {
    const l = [0];
    for (let x = 0; x < taille; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const c = couleur(((x + (sx + 0.5) / N) * 512) / taille, ((y + (sy + 0.5) / N) * 512) / taille, echelle, arrondi);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      l.push(a ? r / a : 0, a ? g / a : 0, a ? b / a : 0, (a / (N * N)) * 255);
    }
    lignes.push(...l);
  }
  const brut = deflateSync(Buffer.from(lignes.map(Math.round)));
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => { let c = 0xffffffff; for (const o of buf) c = crcTable[(c ^ o) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bloc = (type, data) => {
    const t = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
    return Buffer.concat([len, t, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(taille, 0); ihdr.writeUInt32BE(taille, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('IDAT', brut), bloc('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icone-192.png', png(192, 1, true));
writeFileSync('public/icons/icone-512.png', png(512, 1, true));
writeFileSync('public/icons/icone-maskable-512.png', png(512, 0.72, false));
writeFileSync('public/icons/icone-180.png', png(180, 1, false)); // iPhone (arrondi par le système)
console.log('Icônes générées dans public/icons/');
