// ------------------------------------------------------------
// ANNEXES PAR PAYS aux conditions d'utilisation (page /annexes-pays/)
// Le contrat d'abonnement est régi par le droit marocain (Amorac est une société marocaine) ; chaque annexe précise, pour le pays du commerce,
// la monnaie, les taxes, la loi sur les données, la vente à distance des boutiques. Les dispositions impératives du pays l'emportent.
// À faire relire par un juriste de chaque pays avant de la présenter comme définitive. Pour ajouter un pays : ajouter son entrée ici et, si la loi
// sur les données est vérifiée, dans protection-donnees.js.
// ------------------------------------------------------------
export const ANNEXES_PAYS = [
  {
    id: 'maroc', pays: 'Maroc', protection: 'Maroc', monnaie: 'Dirham marocain (MAD)', ohada: false,
    taxes: 'Votre abonnement est facturé en dirhams avec la TVA marocaine de 20 %, comprise dans le prix payé et indiquée sur la facture.',
    vente: 'Les ventes de vos boutiques en ligne aux consommateurs relèvent notamment de la loi n° 31-08 édictant des mesures de protection du consommateur (vente à distance : information préalable du client, conditions accessibles et acceptées avant la commande, délai de rétractation) et du droit du commerce électronique marocain.',
  },
  {
    id: 'cote-d-ivoire', pays: 'Côte d’Ivoire', protection: 'Côte d’Ivoire', monnaie: 'Franc CFA (FCFA)', ohada: true,
    taxes: 'Prestation de services fournie à un commerce établi hors du Maroc : exonérée de TVA marocaine (article 92-I-1° du Code général des impôts marocain), mention portée sur la facture. Les taxes ou retenues locales éventuelles se déclarent selon la loi ivoirienne ; nos factures servent de justificatif.',
    vente: 'Les ventes de vos boutiques en ligne aux consommateurs relèvent du droit ivoirien de la consommation et du commerce électronique (vente à distance, information du client, retours).',
  },
  {
    id: 'senegal', pays: 'Sénégal', protection: 'Sénégal', monnaie: 'Franc CFA (FCFA)', ohada: true,
    taxes: 'Prestation de services fournie à un commerce établi hors du Maroc : exonérée de TVA marocaine (article 92-I-1° du Code général des impôts marocain), mention portée sur la facture. Les taxes ou retenues locales éventuelles se déclarent selon la loi sénégalaise ; nos factures servent de justificatif.',
    vente: 'Les ventes de vos boutiques en ligne aux consommateurs relèvent du droit sénégalais de la consommation et du commerce électronique (vente à distance, information du client, retours).',
  },
  {
    id: 'burkina-faso', pays: 'Burkina Faso', protection: 'Burkina Faso', monnaie: 'Franc CFA (FCFA)', ohada: true,
    taxes: 'Prestation de services fournie à un commerce établi hors du Maroc : exonérée de TVA marocaine (article 92-I-1° du Code général des impôts marocain), mention portée sur la facture. Les taxes ou retenues locales éventuelles se déclarent selon la loi burkinabè ; nos factures servent de justificatif.',
    vente: 'Les ventes de vos boutiques en ligne aux consommateurs relèvent du droit burkinabè de la consommation et du commerce électronique (vente à distance, information du client, retours).',
  },
  {
    id: 'congo', pays: 'Congo (Brazzaville)', protection: 'Congo (Brazzaville)', monnaie: 'Franc CFA (FCFA)', ohada: true,
    taxes: 'Prestation de services fournie à un commerce établi hors du Maroc : exonérée de TVA marocaine (article 92-I-1° du Code général des impôts marocain), mention portée sur la facture. Les taxes ou retenues locales éventuelles se déclarent selon la loi congolaise ; nos factures servent de justificatif.',
    vente: 'Les ventes de vos boutiques en ligne aux consommateurs relèvent du droit congolais de la consommation et du commerce électronique (vente à distance, information du client, retours).',
  },
];
