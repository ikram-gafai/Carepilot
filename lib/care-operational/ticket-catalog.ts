/**
 * Enterprise CARE operational ticket catalog — Carrefour France retail ITSM.
 * Titles and descriptions are seeded into care_source and flow to cp_agent via sync.
 */

export type OperationalTicketCategory =
  | "CHECKOUT"
  | "SCO"
  | "PAYMENT"
  | "NETWORK"
  | "HARDWARE"
  | "LOYALTY"
  | "BACK_OFFICE"
  | "STORE_INFRA"

export type OperationalTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "MONITORING"
  | "RESOLVED"

export type OperationalTicketPriority = "critical" | "high" | "medium" | "low"

export type OperationalTicketCatalogEntry = {
  title: string
  category: OperationalTicketCategory
  priority: OperationalTicketPriority
  status: OperationalTicketStatus
  subCategory: string
  description: string
}

const PERIMETER_CODE: Record<OperationalTicketCategory, string> = {
  CHECKOUT: "FO",
  SCO: "SCO",
  PAYMENT: "MONETIQUE",
  NETWORK: "RESEAU",
  HARDWARE: "MATERIEL",
  LOYALTY: "FIDELITE",
  BACK_OFFICE: "BO",
  STORE_INFRA: "INF",
}

export function perimeterCodeForCategory(category: OperationalTicketCategory): string {
  return PERIMETER_CODE[category]
}

/** 70 unique operational incidents: short titles with no placeholder numbering. */
export const OPERATIONAL_TICKET_CATALOG: OperationalTicketCatalogEntry[] = [
  // Checkout (14)
  {
    title: "Caisse indisponible",
    category: "CHECKOUT",
    priority: "critical",
    status: "OPEN",
    subCategory: "VLP_LANE_DOWN",
    description:
      "La caisse ne prend plus les ventes après un blocage applicatif. Le magasin ne peut pas traiter les paniers sur la caisse concernée. Redémarrage local tenté sans rétablissement.",
  },
  {
    title: "Échec démarrage POS",
    category: "CHECKOUT",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "POS_BOOT",
    description:
      "Le POS reste bloqué sur l'écran de démarrage après reboot. Les autres caisses de la zone sont opérationnelles. Logs demandés au contact IT magasin.",
  },
  {
    title: "Échec authentification connexion caisse",
    category: "CHECKOUT",
    priority: "medium",
    status: "OPEN",
    subCategory: "CASHIER_AUTH",
    description:
      "Les opérateurs ne peuvent pas s'authentifier sur l'application caisse. Accessibilité Active Directory suspectée. Aucune solution de contournement pour les nouvelles sessions.",
  },
  {
    title: "Problème synchronisation caisse",
    category: "CHECKOUT",
    priority: "high",
    status: "MONITORING",
    subCategory: "SESSION_SYNC",
    description:
      "Les totaux caisse divergent des chiffres de clôture back-office. Job de synchronisation relancé ; surveillance de l'écart lors du rapprochement fin de journée.",
  },
  {
    title: "Timeout validation transaction",
    category: "CHECKOUT",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "TXN_VALIDATE",
    description:
      "Les paniers finalisés échouent à la validation finale avec un timeout. Les clients sont orientés vers les caisses adjacentes. Le phénomène a débuté dans la dernière heure.",
  },
  {
    title: "Imprimante fiscale indisponible",
    category: "CHECKOUT",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "FISCAL_PRINT",
    description:
      "Impression ticket fiscal bloquée ; conformité des ventes en risque. Reset matériel effectué. Escalade vers le bridge éditeur pour contrôle certificat et spooler.",
  },
  {
    title: "Terminal paiement caisse non réactif",
    category: "CHECKOUT",
    priority: "high",
    status: "OPEN",
    subCategory: "LANE_TPE",
    description:
      "Le PIN pad intégré ne répond pas à l'envoi du montant. Les tentatives puce et sans contact échouent à la caisse. Cycle d'alimentation terminal incomplet.",
  },
  {
    title: "Échec transfert panier entre caisses",
    category: "CHECKOUT",
    priority: "medium",
    status: "OPEN",
    subCategory: "BASKET_XFER",
    description:
      "Les paniers suspendus ne peuvent pas être déplacés vers une autre caisse après remplacement matériel. Impact sur les opérations magasin en période de forte affluence.",
  },
  {
    title: "Application VLP ne répond pas",
    category: "CHECKOUT",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "VLP_APP",
    description:
      "Client VLP bloqué sur l'écran d'accueil sur plusieurs caisses de la même zone. Redémarrage du service local n'a pas rétabli la réactivité de l'interface.",
  },
  {
    title: "Paiement mixte refusé",
    category: "CHECKOUT",
    priority: "medium",
    status: "MONITORING",
    subCategory: "TENDER_MIX",
    description:
      "Les transactions multi-moyens de paiement sont refusées après la première autorisation. Survient sur combinaisons carte plus titres-restaurant. Sous observation après contrôle paramètres.",
  },
  {
    title: "Override superviseur indisponible",
    category: "CHECKOUT",
    priority: "high",
    status: "OPEN",
    subCategory: "SUP_OVERRIDE",
    description:
      "Les demandes d'approbation manager retournent une erreur d'autorisation. Overrides prix et annulations bloqués jusqu'au rétablissement du service.",
  },
  {
    title: "Clôture fin de journée bloquée",
    category: "CHECKOUT",
    priority: "high",
    status: "ESCALATED",
    subCategory: "EOD_CLOSE",
    description:
      "La clôture Z ne peut pas s'achever en raison de sessions ouvertes en caisse. Échéance clôture financière en risque. Contrôleur magasin mobilisé.",
  },
  {
    title: "Écart prix code-barres à la caisse",
    category: "CHECKOUT",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "PRICE_MISMATCH",
    description:
      "Prix rayon différent du fichier central sur certains PLU. Override temporaire appliqué. Push prix master confirmé réussi.",
  },
  {
    title: "Afficheur client déconnecté",
    category: "CHECKOUT",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "POLE_DISPLAY",
    description:
      "Afficheur client perdu la connexion au POS ; totaux client non affichés. Les ventes continuent sur l'écran caissier uniquement.",
  },
  // SCO (12)
  {
    title: "Terminal SCO hors ligne",
    category: "SCO",
    priority: "critical",
    status: "OPEN",
    subCategory: "SCO_OFFLINE",
    description:
      "Borne libre-service inaccessible sur le VLAN magasin. Le poste accompagnateur affiche l'équipement hors service. Borne retirée du circuit en attente de rétablissement.",
  },
  {
    title: "Caisse libre-service bloquée",
    category: "SCO",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "SCO_FREEZE",
    description:
      "Interface SCO bloquée en cours de transaction. Reset forcé requis sur plusieurs bornes du même îlot. File d'attente au poste accompagnateur.",
  },
  {
    title: "Lecteur paiement SCO hors ligne",
    category: "SCO",
    priority: "high",
    status: "OPEN",
    subCategory: "SCO_PINPAD",
    description:
      "PIN pad SCO ne s'initialise pas après démarrage. Flux sans contact et puce indisponibles. Remplacement par équipement de secours planifié.",
  },
  {
    title: "Défaut calibration balance SCO",
    category: "SCO",
    priority: "medium",
    status: "MONITORING",
    subCategory: "SCO_SCALE",
    description:
      "Vérification poids échoue à chaque scan. Interventions accompagnateur en hausse. Routine de calibration planifiée après fermeture.",
  },
  {
    title: "Défaut capteur zone sachetage SCO",
    category: "SCO",
    priority: "medium",
    status: "OPEN",
    subCategory: "SCO_SENSOR",
    description:
      "Zone sachetage déclenche de fausses alertes article non sacheté. Débit client dégradé. Nettoyage capteur n'a pas levé la panne.",
  },
  {
    title: "Mode accompagnateur SCO inaccessible",
    category: "SCO",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "SCO_ATTENDANT",
    description:
      "L'accompagnateur ne peut pas déverrouiller le SCO pour les produits à âge restreint. Contrôle conformité bloqué. Identifiants vérifiés localement.",
  },
  {
    title: "Bourrage imprimante ticket SCO",
    category: "SCO",
    priority: "low",
    status: "OPEN",
    subCategory: "SCO_PRINT",
    description:
      "Chemin ticket bloqué ; les clients ne peuvent finaliser sans impression accompagnateur. Chemin papier dégagé une fois ; panne réapparue.",
  },
  {
    title: "Timeout balance sécurité SCO",
    category: "SCO",
    priority: "medium",
    status: "MONITORING",
    subCategory: "SCO_SEC_SCALE",
    description:
      "Balance sécurité ne se stabilise pas lors du contrôle poids. Interventions répétées nécessaires. Contrôle firmware en attente.",
  },
  {
    title: "Écran tactile SCO non réactif",
    category: "SCO",
    priority: "high",
    status: "OPEN",
    subCategory: "SCO_TOUCH",
    description:
      "Saisie tactile non enregistrée sur le panneau client. Invites audio actives. Reboot borne ne rétablit pas la couche tactile.",
  },
  {
    title: "Session réseau SCO interrompue",
    category: "SCO",
    priority: "high",
    status: "ESCALATED",
    subCategory: "SCO_NET",
    description:
      "Déconnexions intermittentes du middleware SCO. Transactions avortées à l'étape paiement. Corrélé aux erreurs port switch sur baie B.",
  },
  {
    title: "Blocage produit âge restreint SCO",
    category: "SCO",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "SCO_AGE",
    description:
      "Boucle vérification âge non levée après approbation accompagnateur. Correctif moteur de règles appliqué. Borne remise en service.",
  },
  {
    title: "Erreur distributeur pièces SCO",
    category: "SCO",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "SCO_COIN",
    description:
      "Rendu monnaie échoue avec défaut trémie. Paiements carte non impactés. Éditeur recycleur monnaie notifié.",
  },
  // Payment (10)
  {
    title: "Échec autorisation paiement",
    category: "PAYMENT",
    priority: "critical",
    status: "OPEN",
    subCategory: "AUTH_DECLINE",
    description:
      "Taux élevé de refus d'autorisation sur l'ensemble des caisses. Hôte acquéreur joignable mais codes réponse systémiques. Finance magasin alertée.",
  },
  {
    title: "Timeout passerelle paiement",
    category: "PAYMENT",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "GW_TIMEOUT",
    description:
      "Réponses passerelle dépassent le SLA en période d'autorisation de pointe. Les relances allongent la file aux caisses. Bridge ouvert avec l'acquéreur.",
  },
  {
    title: "Lecture puce EMV intermittente",
    category: "PAYMENT",
    priority: "high",
    status: "MONITORING",
    subCategory: "EMV_CHIP",
    description:
      "Échecs insertion puce sur plusieurs terminaux du magasin. Sans contact fonctionne encore sur un sous-ensemble d'équipements. Firmware terminal en revue.",
  },
  {
    title: "Lecteur sans contact inactif",
    category: "PAYMENT",
    priority: "medium",
    status: "OPEN",
    subCategory: "CTLS_OFF",
    description:
      "Tap NFC non détecté sur les PIN pad caisse. Puce et bande magnétique restent disponibles. Push configuration planifié ce soir.",
  },
  {
    title: "Hôte acquéreur inaccessible",
    category: "PAYMENT",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "ACQUIRER_DOWN",
    description:
      "Aucune réponse d'autorisation depuis le endpoint acquéreur. Toutes les ventes carte en risque. Incident déclaré auprès du centre opérations paiement.",
  },
  {
    title: "Traitement remboursement refusé",
    category: "PAYMENT",
    priority: "high",
    status: "OPEN",
    subCategory: "REFUND_FAIL",
    description:
      "Remboursements client refusés par l'hôte. Recherche transaction d'origine réussie. Processus manuel finance initié.",
  },
  {
    title: "Autorisation carte cadeau refusée",
    category: "PAYMENT",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "GIFT_CARD",
    description:
      "Cartes prépayées refusées malgré solde valide sur le portail émetteur. Isolé à la passerelle région de ce magasin.",
  },
  {
    title: "Timeout connexion portefeuille mobile",
    category: "PAYMENT",
    priority: "high",
    status: "OPEN",
    subCategory: "WALLET_TIMEOUT",
    description:
      "Sessions Apple Pay et Google Pay expirent avant approbation. Flux carte présente non impactés. Latence service token élevée.",
  },
  {
    title: "File store-and-forward en croissance",
    category: "PAYMENT",
    priority: "high",
    status: "MONITORING",
    subCategory: "STORE_FORWARD",
    description:
      "Tampon offline se remplit après brève coupure WAN. Connectivité rétablie ; vidage backlog surveillé pour risque de double capture.",
  },
  {
    title: "Erreur chiffrement PIN pad",
    category: "PAYMENT",
    priority: "critical",
    status: "RESOLVED",
    subCategory: "PIN_ENCRYPT",
    description:
      "Incohérence clé de chiffrement a empêché la saisie PIN. Clés rechargées depuis le HSM. Terminaux confirmés opérationnels après vente test.",
  },
  // Network (9)
  {
    title: "Instabilité réseau magasin",
    category: "NETWORK",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "LAN_INSTABILITY",
    description:
      "Perte de paquets entre VLAN caisse et services magasin. Pics de latence POS observés. Opérations réseau tracent uplink et switches baie.",
  },
  {
    title: "Problème connectivité switch magasin",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "SWITCH_PORT",
    description:
      "Erreurs port switch d'accès sur rack caisse. Lien instable impacte quatre caisses. SFP de secours installé ; surveillance compteurs d'erreurs.",
  },
  {
    title: "VPN magasin indisponible",
    category: "NETWORK",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "VPN_DOWN",
    description:
      "Le magasin ne peut joindre le concentrateur VPN entreprise. Tarification centrale et consultations fidélité dégradées. Ticket opérateur WAN ouvert.",
  },
  {
    title: "Échec résolution DNS au magasin",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "DNS_FAIL",
    description:
      "Noms de services internes non résolus sur le sous-réseau caisse. Repli IP non configuré pour les dépendances critiques.",
  },
  {
    title: "Échecs association point d'accès sans fil",
    category: "NETWORK",
    priority: "medium",
    status: "MONITORING",
    subCategory: "WIFI_ASSOC",
    description:
      "Scanners portables perdent l'association zone réserve vers surface de vente. Audit couverture demandé. Redirection SSID temporaire appliquée.",
  },
  {
    title: "Problème routage VLAN — zone caisse",
    category: "NETWORK",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "VLAN_ROUTE",
    description:
      "Sous-réseau caisse ne joint plus le middleware paiement après fenêtre de changement firewall. Rollback en revue comité de changement.",
  },
  {
    title: "Dégradation WAN inter-magasins",
    category: "NETWORK",
    priority: "medium",
    status: "MONITORING",
    subCategory: "WAN_DEGRADE",
    description:
      "Latence MPLS élevée par rapport à la baseline. Applications restent actives avec réponses plus lentes. Dossier performance opérateur ouvert.",
  },
  {
    title: "Scope DHCP épuisé — sous-réseau caisse",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "DHCP_EXhaust",
    description:
      "Nouveaux équipements caisse ne peuvent obtenir d'adresses. Baux existants renouvelés manuellement. Extension scope en attente d'approbation.",
  },
  {
    title: "Pic de latence sur WAN magasin",
    category: "NETWORK",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "WAN_LATENCY",
    description:
      "Pic de latence bref pendant maintenance opérateur. Levé après fin de fenêtre. Aucun impact client supplémentaire signalé.",
  },
  // Hardware (8)
  {
    title: "Communication imprimante perdue",
    category: "HARDWARE",
    priority: "medium",
    status: "OPEN",
    subCategory: "PRINT_COMM",
    description:
      "Imprimante ticket plus visible par le spooler POS. Chemins USB et Ethernet vérifiés. Réinstallation driver planifiée.",
  },
  {
    title: "Imprimante ticket hors ligne",
    category: "HARDWARE",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "RECEIPT_OFF",
    description:
      "Alimentation imprimante OK mais statut offline dans le POS. Caisses parallèles impriment normalement. Remplacement par unité de secours en cours.",
  },
  {
    title: "Dysfonctionnement tiroir-caisse",
    category: "HARDWARE",
    priority: "high",
    status: "OPEN",
    subCategory: "DRAWER",
    description:
      "Tiroir ne s'ouvre pas sur commande de clôture. Ouverture manuelle par clé requise. Driver solénoïde suspecté.",
  },
  {
    title: "Scanner non détecté",
    category: "HARDWARE",
    priority: "medium",
    status: "OPEN",
    subCategory: "SCANNER",
    description:
      "Scanner portable absent du gestionnaire de périphériques après reconnexion au socle. Câble et port hub remplacés sans correction.",
  },
  {
    title: "Erreur communication balance",
    category: "HARDWARE",
    priority: "high",
    status: "MONITORING",
    subCategory: "SCALE_COMM",
    description:
      "Balance intégrée retourne défaut communication lors de vente PLU pesé. Articles non pesés scannés normalement.",
  },
  {
    title: "Décharge batterie scanner portable",
    category: "HARDWARE",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "HH_BATTERY",
    description:
      "Appareils perdent la charge en une seule vacation. LED socle de charge normales. Remplacement lot batteries demandé.",
  },
  {
    title: "Événement alimentation UPS sur rack caisse",
    category: "HARDWARE",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "UPS_EVENT",
    description:
      "Coupure brève a déclenché alarme UPS sur rack caisse. Équipements redémarrés proprement. Qualité alimentation acceptable après inspection.",
  },
  {
    title: "Défaillance port hub caisse",
    category: "HARDWARE",
    priority: "high",
    status: "OPEN",
    subCategory: "HUB_PORT",
    description:
      "Port hub périphériques hors service ; scanner et imprimante partagent la même connexion. Remplacement module hub approuvé.",
  },
  // Loyalty (4)
  {
    title: "Service fidélité indisponible",
    category: "LOYALTY",
    priority: "high",
    status: "OPEN",
    subCategory: "LOYALTY_SVC",
    description:
      "Consultation membre retourne service indisponible sur toutes les caisses. Accumulation offline désactivée. Marketing notifié pour communication client.",
  },
  {
    title: "Retard synchronisation solde avantages",
    category: "LOYALTY",
    priority: "medium",
    status: "MONITORING",
    subCategory: "ENTITLEMENT",
    description:
      "Soldes se mettent à jour lentement après événements d'accumulation. Achats se finalisent sans affichage points temps réel. Rattrapage batch en cours.",
  },
  {
    title: "Timeout service validation coupon",
    category: "LOYALTY",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "COUPON",
    description:
      "Coupons digitaux expirent à la validation. Bons papier traités manuellement. Équipe moteur promotion mobilisée.",
  },
  {
    title: "Échec recherche profil membre",
    category: "LOYALTY",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "PROFILE",
    description:
      "API profil a retourné des erreurs pour recherche par téléphone. Service rétabli après purge cache. Aucune perte de données identifiée.",
  },
  // Back office (8)
  {
    title: "Échec synchronisation back-office",
    category: "BACK_OFFICE",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "BO_SYNC",
    description:
      "Back-office magasin n'a pas reçu l'extrait de clôture des caisses. Rapprochement en attente. Job re-sync lancé avec piste d'audit.",
  },
  {
    title: "Problème réplication mise à jour prix",
    category: "BACK_OFFICE",
    priority: "high",
    status: "OPEN",
    subCategory: "PRICE_REPL",
    description:
      "Fichier prix central non appliqué au référentiel article magasin. Risque prix incorrect au scan. Blocage manuel sur rayons impactés.",
  },
  {
    title: "Retard synchronisation inventaire",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "MONITORING",
    subCategory: "INV_SYNC",
    description:
      "Stock disponible accuse plus de deux heures de retard sur mouvements réserve. Ventes continuent sur dernière quantité connue. Boucle supply chain informée.",
  },
  {
    title: "Import fichier promotion bloqué",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "OPEN",
    subCategory: "PROMO_IMPORT",
    description:
      "Package promotion hebdomadaire bloqué en file d'import. Fenêtre de démarrage offre demain matin. Relance prioritaire demandée.",
  },
  {
    title: "Retard publication données de référence",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "MDM_PUBLISH",
    description:
      "Attributs article non visibles en caisse après mise à jour corporate. Rafraîchissement cache incomplet. Opérations MDM valident le bundle.",
  },
  {
    title: "Crash application POS",
    category: "BACK_OFFICE",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "POS_CRASH",
    description:
      "Exécutable POS se termine avec défaut mémoire sur plusieurs caisses. Dumps crash collectés. Bridge développement éditeur mobilisé.",
  },
  {
    title: "Alerte réplication Active Directory",
    category: "BACK_OFFICE",
    priority: "high",
    status: "MONITORING",
    subCategory: "AD_REPL",
    description:
      "Contrôleur magasin signale latence réplication vers DC hub. Authentification reste fonctionnelle. Surveillance jusqu'à vidage du backlog.",
  },
  {
    title: "Dépassement fenêtre maintenance SQL",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "SQL_MAINT",
    description:
      "Maintenance base de données a dépassé la fenêtre planifiée. Services rétablis après rebuild index prolongé. Ouverture magasin non retardée.",
  },
  // Store infrastructure (5)
  {
    title: "Serveur magasin inaccessible",
    category: "STORE_INFRA",
    priority: "critical",
    status: "OPEN",
    subCategory: "SRV_DOWN",
    description:
      "Serveur in-store principal ne répond ni au ping ni à l'agent de supervision. Caisses en mode dégradé offline là où autorisé.",
  },
  {
    title: "Perte heartbeat hyperviseur",
    category: "STORE_INFRA",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "HV_HEARTBEAT",
    description:
      "Heartbeat hôte VM absent dans la supervision. Services POS invités migrés vers nœud secondaire. Analyse cause racine en cours.",
  },
  {
    title: "Échec job sauvegarde — systèmes magasin",
    category: "STORE_INFRA",
    priority: "medium",
    status: "OPEN",
    subCategory: "BACKUP_FAIL",
    description:
      "Sauvegarde nocturne non terminée ; politique de rétention en risque. Espace disque dans les seuils. Job replanifié avec logs verbeux.",
  },
  {
    title: "Seuil disque base magasin dépassé",
    category: "STORE_INFRA",
    priority: "high",
    status: "ESCALATED",
    subCategory: "DISK_ALERT",
    description:
      "Volume base de données au-dessus du seuil critique. Autogrowth activé mais latence en hausse. Extension capacité approuvée pour ce soir.",
  },
  {
    title: "Service contrôleur magasin arrêté",
    category: "STORE_INFRA",
    priority: "high",
    status: "MONITORING",
    subCategory: "CTRL_SVC",
    description:
      "Service orchestration local arrêté après reboot patch. Redémarré manuellement. Surveillance chaîne de dépendances sur prochaine tâche planifiée.",
  },
]

export function catalogEntryCount(): number {
  return OPERATIONAL_TICKET_CATALOG.length
}
