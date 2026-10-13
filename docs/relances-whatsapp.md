# Relances WhatsApp de l'essai (équipe Amorac)

Dans l'espace Amorac, le tableau de bord (carte « À relancer ») propose à chaque commerce **l'étape conseillée** avec un bouton
« Relancer sur WhatsApp » : WhatsApp s'ouvre avec le message déjà écrit (prénom du gérant, nom du commerce, prix). La fiche d'un commerce
a aussi une carte « Relance WhatsApp » où l'on peut choisir une autre étape et modifier le texte avant l'envoi. **Rien n'est envoyé
automatiquement** : c'est une personne de l'équipe qui appuie sur Envoyer, ce qui garde un ton humain et respecte les règles de WhatsApp.

| Étape | Quand elle est proposée | But |
|---|---|---|
| Bienvenue | Jour 0 à 1 | Rassurer, donner les 2 premières actions (articles, première vente) |
| Pas encore démarré | Moins de 3 articles après 2 jours | Proposer de l'aide pour ajouter les articles |
| Plus d'activité | Pas utilisé depuis 4 jours ou plus | Comprendre ce qui bloque |
| Conseil d'usage | Jours 3 à 10, le commerce utilise Kaislo | Reçu WhatsApp, fermeture de la journée, résumé du soir |
| Point à mi-parcours | Jours 13 à 20 | Recueillir ce qui plaît et ce qui manque |
| Fin d'essai proche | 5 jours ou moins avant la fin | Présenter le prix, les moyens de paiement, l'offre annuelle |
| Essai terminé | Après la fin, pendant 45 jours | Reprendre contact, lever les freins (prix, fonction) |
| Merci, avis et parrainage | À envoyer à la main aux abonnés satisfaits | Demander un avis (Compte → Donner mon avis) et le parrainage |

Les textes sont dans `src/lib/donnees/relances.js` (modifiables ; testés dans `tests/relances.test.mjs`).

## Habitudes conseillées
- Écrire dans les 24 heures qui suivent chaque inscription (à votre taille, un appel ou un message personnel est ce qui convertit le mieux).
- Noter dans « Notes internes » de la fiche ce que le commerçant a répondu.
- Demander la raison quand quelqu'un arrête : c'est ce qui indique quoi améliorer.

# Parrainage entre commerçants

- Chaque commerce a un code **P + les 6 chiffres de son code commerce** (menu Compte → Parrainer un commerçant), avec un message WhatsApp prêt à envoyer.
- Le commerçant parrainé s'inscrit avec ce code (lien `kaislo.com/app/?ref=P123456` ou saisie à l'inscription) : **30 jours d'essai en plus** (60 au total).
- À son **premier paiement** enregistré dans l'espace Amorac, le commerce parrain reçoit **30 jours offerts** (sur son abonnement s'il en a un, sinon sur son essai).
- Garde-fous : le parrain et le filleul doivent avoir des gérants différents (numéros différents), une seule récompense par filleul, 12 récompenses au plus par commerce parrain. Le code d'un commercial Kaislo (lettres et chiffres, par exemple AWA42) reste un autre système (remise et commission) ; un code de commercial ne peut pas avoir la forme P + 6 chiffres.
- L'espace Amorac montre « Parrainé par » et le nombre de commerces parrainés dans la fiche du commerce.
