/**
 * Catalogue KM opérationnel FO — contenu structuré pour la page Procédures agent.
 */

export type KmProcedureCatalogEntry = {
  code: string
  title: string
  category: string
  perimeter: string
  summary: string
  estimatedMinutes: number
  beforeApplying: string[]
  procedureSteps: string[]
  ifFailed: string[]
  baselineSuccessPct: number
}

export const KM_PROCEDURE_CATALOG: KmProcedureCatalogEntry[] = [
  {
    code: "KM-OP-001",
    title: "Procédure reprise caisse VLP",
    category: "Caisse",
    perimeter: "FO",
    summary: "Reprise caisse après blocage session ou gel applicatif sur lane VLP.",
    estimatedMinutes: 5,
    beforeApplying: [
      "Confirmer le code magasin et le numéro de caisse",
      "Vérifier l'état du terminal et des périphériques",
      "Contrôler la connectivité réseau lane",
      "Demander au magasin le message d'erreur exact",
    ],
    procedureSteps: [
      "Mettre la caisse en maintenance courte et informer le magasin",
      "Isoler la session applicative bloquée",
      "Redémarrer les services VLP dans l'ordre prescrit",
      "Valider un flux panier test avec le magasin",
    ],
    ifFailed: [
      "Collecter les logs caisse et capture d'écran",
      "Joindre l'historique des tentatives FO",
      "Escalader N3 périmètre FO",
    ],
    baselineSuccessPct: 88,
  },
  {
    code: "KM-OP-002",
    title: "Diagnostic terminal de paiement",
    category: "Monétique",
    perimeter: "Monétique",
    summary: "Diagnostic TPE après refus autorisation, timeout ou erreur acquéreur.",
    estimatedMinutes: 6,
    beforeApplying: [
      "Confirmer code magasin, lane et identifiant terminal",
      "Vérifier le statut terminal et la liaison acquéreur",
      "Contrôler l'heure incident et la trace erreur",
      "Demander une transaction test au magasin",
    ],
    procedureSteps: [
      "Redémarrer le service paiement caisse",
      "Réinitialiser la session terminal",
      "Exécuter une autorisation test",
      "Valider la transaction avec l'utilisateur magasin",
    ],
    ifFailed: [
      "Capturer la trace acquéreur et logs TPE",
      "Joindre capture du message erreur",
      "Escalader N3 ou router Monétique selon diagnostic",
    ],
    baselineSuccessPct: 86,
  },
  {
    code: "KM-OP-003",
    title: "Vérification chemin réseau magasin",
    category: "Réseau",
    perimeter: "Réseau",
    summary: "Contrôle chemin réseau magasin : passerelle, VLAN, DNS et lien physique.",
    estimatedMinutes: 8,
    beforeApplying: [
      "Identifier la fenêtre incident et les services impactés",
      "Confirmer topologie magasin et point de rattachement",
      "Vérifier si d'autres lanes sont affectées",
      "Collecter les métriques latence / perte si disponibles",
    ],
    procedureSteps: [
      "Tester passerelle magasin et premier saut opérateur",
      "Contrôler résolution DNS des services métier",
      "Vérifier VLAN et port agrégation caisse",
      "Comparer avec une lane de référence du même lot",
    ],
    ifFailed: [
      "Documenter métriques et tests effectués",
      "Transférer Réseau avec synthèse incident",
      "Suspendre clôture FO en attente retour spécialiste",
    ],
    baselineSuccessPct: 82,
  },
  {
    code: "KM-OP-004",
    title: "Remplacement périphérique matériel",
    category: "Matériel",
    perimeter: "Matériel",
    summary: "Remplacement ou recette périphérique caisse : scanner, imprimante, hub.",
    estimatedMinutes: 7,
    beforeApplying: [
      "Confirmer modèle périphérique et numéro de série",
      "Vérifier câblage et alimentation",
      "Identifier pièce de rechange disponible magasin",
      "Photographier l'état avant intervention",
    ],
    procedureSteps: [
      "Isoler le périphérique défaillant",
      "Remplacer module ou câble selon diagnostic",
      "Exécuter test de recette sur lane",
      "Valider avec le magasin avant remise en service",
    ],
    ifFailed: [
      "Conserver pièce défectueuse pour analyse",
      "Transférer Matériel avec numéro de série",
      "Escalader si indisponibilité caisse prolongée",
    ],
    baselineSuccessPct: 84,
  },
  {
    code: "KM-OP-005",
    title: "Synchronisation avantages fidélité",
    category: "Fidélité",
    perimeter: "Fidélité",
    summary: "Relance synchro avantages fidélité et validation solde client en magasin.",
    estimatedMinutes: 5,
    beforeApplying: [
      "Confirmer identifiant client ou carte fidélité",
      "Vérifier fenêtre batch et dernière synchro réussie",
      "Contrôler charge middleware et logs batch",
      "Demander au magasin le symptôme exact (solde, avantage)",
    ],
    procedureSteps: [
      "Identifier le dernier job réussi et l'écart temporel",
      "Relancer synchro incrémentale si autorisée",
      "Contrôler un échantillon d'avantages en magasin",
      "Valider solde client avec l'opérateur caisse",
    ],
    ifFailed: [
      "Exporter logs batch et erreurs middleware",
      "Transférer Fidélité avec identifiants client",
      "Suspendre clôture jusqu'à confirmation back-office",
    ],
    baselineSuccessPct: 80,
  },
]

export const KM_PROCEDURE_BY_CODE = new Map(KM_PROCEDURE_CATALOG.map((k) => [k.code, k]))
