# Kaisly — Démo (PWA)

Version de **démonstration** de la caisse Kaisly, pour présenter le produit aux premiers clients.
La version finale sera une **vraie application mobile** (Android + iPhone) reliée à un serveur Laravel.

## Ce que contient la démo

- 2 commerces prêts à montrer : **Maquis Chez Tantie Awa** (Abidjan, FCFA) et **Épicerie Al Baraka** (Casablanca, DH)
- 45 jours de ventes déjà générées pour avoir de belles statistiques
- Codes PIN : gérant **1234**, vendeurs **0000** et **1111**
- Les données restent **dans le téléphone** (rien n'est envoyé sur Internet)

## Lancer sur votre PC

```bash
npm install        # une seule fois
npm run dev        # puis ouvrir http://localhost:5173
```

Pour tester sur votre téléphone (même Wi-Fi) : ouvrez l'adresse « Network » affichée par `npm run dev`.
Attention : le Bluetooth et l'installation ne marchent qu'en **HTTPS** (donc une fois en ligne).

## Mettre en ligne sur Hostinger

1. `npm run build` → crée le dossier `dist/`
2. Dans hPanel : créer un sous-domaine (ex. `demo.amorac.com`) et activer le **SSL** (gratuit)
3. Gestionnaire de fichiers → dossier du sous-domaine → envoyer **tout le contenu** de `dist/`
4. À chaque nouvelle version : changer `VERSION` dans `public/sw.js`, refaire `npm run build`, renvoyer `dist/`

## Organisation du code

| Dossier / fichier | Rôle |
|---|---|
| `index.html` | Tous les écrans (HTML + Alpine.js) |
| `src/styles.css` | Le design (couleurs Amorac / Kaisly) |
| `src/ecrans/` | La logique de chaque écran (caisse, ventes, catalogue…) |
| `src/donnees/demo.js` | Les commerces, produits et ventes de démo |
| `src/donnees/stockage.js` | **Où sont enregistrées les données** → sera remplacé par l'API Laravel |
| `src/impression/` | **Tout ce qui concerne l'imprimante** → `bluetooth-web.js` sera remplacé par le Bluetooth natif dans l'app mobile |

## Imprimante

- Imprimante thermique **Bluetooth BLE**, 58 ou 80 mm, compatible ESC/POS
- Dans la démo : **Chrome sur Android** uniquement (limite du navigateur)
- Sur iPhone : la vente fonctionne, avec l'aperçu du ticket à l'écran
