/** Canonical Carrefour France operational store catalog (care_source.stores). */

export type CarrefourStoreType =
  | "Hypermarché"
  | "Carrefour Market"
  | "Carrefour City"
  | "Carrefour Contact"

export type CarrefourStoreSeed = {
  storeCode: string
  storeName: string
  city: string
  region: string
  storeType: CarrefourStoreType
}

export const CARREFOUR_OPERATIONAL_STORES: CarrefourStoreSeed[] = [
  {
    storeCode: "FR-HYP-PAR-AUTEUIL",
    storeName: "Carrefour Paris Auteuil",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-PAR-SAINTMARCEL",
    storeName: "Carrefour Market Paris Saint-Marcel",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-LYO-PARTDIEU",
    storeName: "Carrefour Lyon Part-Dieu",
    city: "Lyon",
    region: "Auvergne-Rhône-Alpes",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-HYP-MRS-BONNEVEINE",
    storeName: "Carrefour Marseille Bonneveine",
    city: "Marseille",
    region: "Provence-Alpes-Côte d'Azur",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-LIL-EURALILLE",
    storeName: "Carrefour Lille Euralille",
    city: "Lille",
    region: "Hauts-de-France",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-TOU-PURPAN",
    storeName: "Carrefour Toulouse Purpan",
    city: "Toulouse",
    region: "Occitanie",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-BDX-MERIGNAC",
    storeName: "Carrefour Bordeaux Mérignac",
    city: "Mérignac",
    region: "Nouvelle-Aquitaine",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-NTE-BEAULIEU",
    storeName: "Carrefour Nantes Beaulieu",
    city: "Nantes",
    region: "Pays de la Loire",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-RNS-ALMA",
    storeName: "Carrefour Rennes Alma",
    city: "Rennes",
    region: "Bretagne",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-STR-RIVETOILE",
    storeName: "Carrefour Strasbourg Rivetoile",
    city: "Strasbourg",
    region: "Grand Est",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-MTP-LATTES",
    storeName: "Carrefour Montpellier Lattes",
    city: "Lattes",
    region: "Occitanie",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-GRE-MEYLAN",
    storeName: "Carrefour Grenoble Meylan",
    city: "Meylan",
    region: "Auvergne-Rhône-Alpes",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-ROU-BARENTIN",
    storeName: "Carrefour Rouen Barentin",
    city: "Barentin",
    region: "Normandie",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-DIJ-TOISON",
    storeName: "Carrefour Dijon Toison d'Or",
    city: "Dijon",
    region: "Bourgogne-Franche-Comté",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-TOU-LARICHE",
    storeName: "Carrefour Tours La Riche",
    city: "Tours",
    region: "Centre-Val de Loire",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-REI-CERNAY",
    storeName: "Carrefour Reims Cernay",
    city: "Reims",
    region: "Grand Est",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-ANG-GRANDMAINE",
    storeName: "Carrefour Angers Grand Maine",
    city: "Angers",
    region: "Pays de la Loire",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-NCE-LINGOSTIERE",
    storeName: "Carrefour Nice Lingostière",
    city: "Nice",
    region: "Provence-Alpes-Côte d'Azur",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-PAR-LADEFENSE",
    storeName: "Carrefour Paris La Défense",
    city: "Puteaux",
    region: "Île-de-France",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-PAR-RIVOLI",
    storeName: "Carrefour Market Paris Rivoli",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-CTY-PAR-BASTILLE",
    storeName: "Carrefour City Paris Bastille",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour City",
  },
  {
    storeCode: "FR-CTY-PAR-MONTPARNASSE",
    storeName: "Carrefour City Paris Montparnasse",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour City",
  },
  {
    storeCode: "FR-CTY-LYO-PRESQUILE",
    storeName: "Carrefour City Lyon Presqu'île",
    city: "Lyon",
    region: "Auvergne-Rhône-Alpes",
    storeType: "Carrefour City",
  },
  {
    storeCode: "FR-CNT-PAR-GARELYON",
    storeName: "Carrefour Contact Paris Gare de Lyon",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour Contact",
  },
  {
    storeCode: "FR-CNT-PAR-GARENORD",
    storeName: "Carrefour Contact Paris Gare du Nord",
    city: "Paris",
    region: "Île-de-France",
    storeType: "Carrefour Contact",
  },
  {
    storeCode: "FR-CNT-LYO-PERRACHE",
    storeName: "Carrefour Contact Lyon Perrache",
    city: "Lyon",
    region: "Auvergne-Rhône-Alpes",
    storeType: "Carrefour Contact",
  },
  {
    storeCode: "FR-MKT-CLF-AUBIERE",
    storeName: "Carrefour Market Clermont-Ferrand Aubière",
    city: "Aubière",
    region: "Auvergne-Rhône-Alpes",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-HYP-AVI-CAPAVENIR",
    storeName: "Carrefour Avignon Cap Sud",
    city: "Avignon",
    region: "Provence-Alpes-Côte d'Azur",
    storeType: "Hypermarché",
  },
  {
    storeCode: "FR-MKT-AMI-CENTRE",
    storeName: "Carrefour Market Amiens",
    city: "Amiens",
    region: "Hauts-de-France",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-MET-CENTRE",
    storeName: "Carrefour Market Metz",
    city: "Metz",
    region: "Grand Est",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-CAE-CENTRE",
    storeName: "Carrefour Market Caen",
    city: "Caen",
    region: "Normandie",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-ORL-SARAN",
    storeName: "Carrefour Market Orléans Saran",
    city: "Saran",
    region: "Centre-Val de Loire",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-BES-MICROVAL",
    storeName: "Carrefour Market Besançon Micropolis",
    city: "Besançon",
    region: "Bourgogne-Franche-Comté",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-BST-CENTRE",
    storeName: "Carrefour Market Brest",
    city: "Brest",
    region: "Bretagne",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-MKT-PAU-UNIVERSITE",
    storeName: "Carrefour Market Pau",
    city: "Pau",
    region: "Nouvelle-Aquitaine",
    storeType: "Carrefour Market",
  },
  {
    storeCode: "FR-CTY-LIL-CENTRE",
    storeName: "Carrefour City Lille Centre",
    city: "Lille",
    region: "Hauts-de-France",
    storeType: "Carrefour City",
  },
]

/** Top 5 stores by ticket volume (70 slots). */
export const TOP_MAGASIN_STORE_CODES = [
  "FR-HYP-PAR-AUTEUIL",
  "FR-MKT-PAR-SAINTMARCEL",
  "FR-HYP-LYO-PARTDIEU",
  "FR-HYP-MRS-BONNEVEINE",
  "FR-MKT-LIL-EURALILLE",
] as const

/** Mid-tier stores (2 tickets each). */
export const MID_TIER_STORE_CODES = [
  "FR-HYP-TOU-PURPAN",
  "FR-MKT-BDX-MERIGNAC",
  "FR-HYP-NTE-BEAULIEU",
  "FR-MKT-RNS-ALMA",
  "FR-HYP-STR-RIVETOILE",
  "FR-MKT-MTP-LATTES",
  "FR-MKT-GRE-MEYLAN",
  "FR-MKT-ROU-BARENTIN",
  "FR-HYP-DIJ-TOISON",
  "FR-MKT-NCE-LINGOSTIERE",
] as const

const STORE_CODE_SET = new Set(CARREFOUR_OPERATIONAL_STORES.map((s) => s.storeCode))

export function getStoreByCode(code: string): CarrefourStoreSeed | undefined {
  return CARREFOUR_OPERATIONAL_STORES.find((s) => s.storeCode === code)
}

export function assertOperationalStoreCode(code: string): string {
  if (!STORE_CODE_SET.has(code)) {
    throw new Error(`Unknown store code: ${code}`)
  }
  return code
}

/** Build 70 ticket→store assignments: top 5 heavy, 10 mid, 20 single-slot stores. */
export function buildStoreSlotCodes(): string[] {
  const lowTier = CARREFOUR_OPERATIONAL_STORES.map((s) => s.storeCode).filter(
    (c) =>
      !TOP_MAGASIN_STORE_CODES.includes(c as (typeof TOP_MAGASIN_STORE_CODES)[number]) &&
      !MID_TIER_STORE_CODES.includes(c as (typeof MID_TIER_STORE_CODES)[number]),
  )

  return [
    ...Array(7).fill(TOP_MAGASIN_STORE_CODES[0]),
    ...Array(7).fill(TOP_MAGASIN_STORE_CODES[1]),
    ...Array(6).fill(TOP_MAGASIN_STORE_CODES[2]),
    ...Array(5).fill(TOP_MAGASIN_STORE_CODES[3]),
    ...Array(5).fill(TOP_MAGASIN_STORE_CODES[4]),
    ...MID_TIER_STORE_CODES.flatMap((c) => Array(2).fill(c)),
    ...lowTier.flatMap((c) => [c]),
  ]
}
