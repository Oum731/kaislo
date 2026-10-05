// ------------------------------------------------------------
// Remet un fichier à l'utilisateur : sur téléphone, la feuille de partage du système (WhatsApp, e-mail, Drive, « Enregistrer dans Fichiers »…) ;
// sur ordinateur, un téléchargement classique. Si le partage est refusé ou indisponible, on télécharge.
// ------------------------------------------------------------
const telephone = () => typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

function telecharger(octets, nom, mime) {
  const url = URL.createObjectURL(new Blob([octets], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Renvoie 'partage' ou 'telechargement' (ou 'annule' si l'utilisateur ferme la feuille de partage). */
export async function livrerFichier(octets, nom, mime) {
  if (telephone() && typeof navigator.share === 'function' && typeof File === 'function') {
    try {
      const fichier = new File([octets], nom, { type: mime });
      if (!navigator.canShare || navigator.canShare({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: nom });
        return 'partage';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'annule';
      // autre erreur (partage non autorisé…) : on télécharge
    }
  }
  telecharger(octets, nom, mime);
  return 'telechargement';
}

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_PDF = 'application/pdf';
