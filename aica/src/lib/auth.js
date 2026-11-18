import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

const COOKIE = 'aica_admin';
const DUREE = 60 * 60 * 24 * 7; // 7 jours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET manquant ou trop court (16 caractères minimum)');
  return s;
}
const sign = (v) => createHmac('sha256', secret()).update(v).digest('base64url');

function egal(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function verifierIdentifiants(email, motDePasse) {
  const e = process.env.ADMIN_EMAIL, p = process.env.ADMIN_PASSWORD;
  if (!e || !p) return false;
  const ok1 = egal(String(email).trim().toLowerCase(), e.trim().toLowerCase());
  const ok2 = egal(motDePasse, p);
  return ok1 && ok2;
}

export async function ouvrirSession() {
  const exp = Math.floor(Date.now() / 1000) + DUREE;
  const v = String(exp);
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DUREE });
}

export async function fermerSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  try {
    const c = (await cookies()).get(COOKIE)?.value;
    if (!c) return false;
    const [v, sig] = c.split('.');
    if (!v || !sig || !egal(sig, sign(v))) return false;
    return Number(v) > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function exigerAdmin() {
  if (!(await isAdmin())) {
    const { redirect } = await import('next/navigation');
    redirect('/admin/login');
  }
}

export function hashIp(request) {
  const ip = (request.headers.get('x-forwarded-for') || 'inconnu').split(',')[0].trim();
  return createHash('sha256').update(ip + (process.env.SESSION_SECRET || '')).digest('hex').slice(0, 32);
}
