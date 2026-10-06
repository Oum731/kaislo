// ------------------------------------------------------------
// PAYS DU VISITEUR (pour n'afficher que les tarifs et la devise de son pays)
//
// Ordre de priorité :
//  1. le pays choisi par le visiteur (cookie « kaislo_pays », aussi gardé dans l'appareil)
//  2. sa position GPS, seulement s'il appuie sur « Utiliser ma position » (le navigateur demande son accord)
//  3. son adresse IP, via notre serveur (/api/pays) : instantané, sans demande
//  4. le fuseau horaire, puis la langue du navigateur (rapide, hors connexion)
// Le cookie ne sert qu'à se souvenir de ce choix : aucun suivi, rien n'est envoyé à un tiers,
// sauf l'adresse IP (service de géolocalisation côté serveur) et les coordonnées GPS (service de
// recherche de pays), et seulement dans les cas 2 et 3 ci-dessus.
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import { PAYS } from '@/lib/donnees/modeles';
import { chemin } from '@/config';

// Pays affiché dans la page générée à l'avance (avant que l'appareil du visiteur ne soit consulté)
export const PAYS_PAR_DEFAUT = 'CI';
const CLE = 'kaislo_pays';
const AUTRE_PAYS = 'XX'; // pays hors de la liste : tarifs en dollars

const FUSEAUX = {
  'Africa/Casablanca': 'MA', 'Africa/El_Aaiun': 'MA', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF', 'Africa/Porto-Novo': 'BJ', 'Africa/Lome': 'TG', 'Africa/Niamey': 'NE', 'Africa/Conakry': 'GN',
  'Africa/Douala': 'CM', 'Africa/Libreville': 'GA', 'Africa/Brazzaville': 'CG', 'Europe/Paris': 'FR', 'Europe/Brussels': 'BE',
  'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Winnipeg': 'CA',
  'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
};

const existe = (id) => PAYS.some((p) => p.id === id);
// Code de pays reconnu → pays de la liste, sinon « Autre pays »
const versListe = (code) => (existe(code) ? code : AUTRE_PAYS);

// ---------- Choix gardé (cookie + appareil) ----------

export function lirePaysChoisi() {
  let id = null;
  try { id = (document.cookie.match(new RegExp('(?:^|; )' + CLE + '=([A-Z]{2})')) || [])[1] || localStorage.getItem(CLE); } catch { /* stockage bloqué */ }
  return existe(id) ? id : null;
}

export function choisirPays(id) {
  try {
    const securise = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CLE}=${id}; Max-Age=31536000; Path=/; SameSite=Lax${securise}`;
  } catch { /* cookies bloqués */ }
  try { localStorage.setItem(CLE, id); } catch { /* stockage bloqué */ }
}

// ---------- Détection ----------

// Fuseau horaire puis langue du navigateur : instantané. null si on ne sait pas.
export function devinerPays() {
  try {
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (FUSEAUX[fuseau]) return FUSEAUX[fuseau];
  } catch { /* ignoré */ }
  const region = (typeof navigator !== 'undefined' ? navigator.language || '' : '').split('-')[1]?.toUpperCase();
  return existe(region) ? region : null;
}

// Adresse IP : notre serveur interroge un service de géolocalisation (/api/pays). null si indisponible.
export async function paysParIp() {
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), 3500);
  try {
    const r = await fetch(chemin('/api/pays'), { signal: controle.signal, cache: 'no-store' });
    const j = await r.json();
    return j?.ok && j.pays ? versListe(j.pays) : null;
  } catch { return null; } finally { clearTimeout(minuterie); }
}

// Position GPS : le navigateur demande l'accord du visiteur, puis un service gratuit transforme les
// coordonnées en pays. Renvoie { pays } ou { erreur }.
export function paysParGps() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({ erreur: 'Position indisponible sur cet appareil.' });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`;
          const j = await fetch(url).then((r) => r.json());
          const code = String(j.countryCode || '').toUpperCase();
          resolve(code ? { pays: versListe(code) } : { erreur: 'Pays introuvable pour cette position.' });
        } catch { resolve({ erreur: 'Recherche impossible (pas de connexion ?).' }); }
      },
      () => resolve({ erreur: 'Position refusée : choisissez votre pays dans la liste.' }),
      { timeout: 10000, maximumAge: 600000 },
    );
  });
}

// Pays à utiliser, par ordre de priorité, sans GPS (voir l'en-tête). `surResultat` est rappelé une 2e fois quand l'IP répond.
export async function trouverPays(surResultat) {
  const choisi = lirePaysChoisi();
  if (choisi) return surResultat(choisi);
  const appareil = devinerPays();
  if (appareil) surResultat(appareil);
  const ip = await paysParIp();
  if (ip) surResultat(ip);
  else if (!appareil) surResultat(AUTRE_PAYS);
}

// Pays du visiteur partagé par tous les composants du site (une seule détection, même s'il y a dix captures sur la page)
let paysCourant = PAYS_PAR_DEFAUT;
let erreurCourante = '';
let detectionLancee = false;
const abonnes = new Set();
const diffuser = () => abonnes.forEach((f) => f());
function fixer(id) { if (id !== paysCourant) { paysCourant = id; diffuser(); } }
function lancerDetection() {
  if (detectionLancee) return;
  detectionLancee = true;
  trouverPays(fixer);
}
const changerPays = (nouveau) => { choisirPays(nouveau); erreurCourante = ''; paysCourant = nouveau; diffuser(); };
const gpsPays = async () => {
  erreurCourante = ''; diffuser();
  const r = await paysParGps();
  if (r.pays) changerPays(r.pays); else { erreurCourante = r.erreur; diffuser(); }
};

// Pour les composants du site : [pays, changer, { gps, erreur }]
export function useSelectionPays() {
  const [, redessiner] = useState(0);
  useEffect(() => {
    const f = () => redessiner((n) => n + 1);
    abonnes.add(f);
    lancerDetection();
    return () => { abonnes.delete(f); };
  }, []);
  const pays = PAYS.find((p) => p.id === paysCourant) || PAYS.find((p) => p.id === AUTRE_PAYS);
  return [pays, changerPays, { gps: gpsPays, erreur: erreurCourante }];
}
