/**
 * Calculs du comptoir. Ces montants servent à l'affichage pendant la saisie ;
 * les montants officiels du dépôt sont recalculés par la base (triggers).
 */
import { ajouterJours, formatFCFA } from "./format";

export type TypeLigne = "article" | "kilo" | "lot";

export interface LignePanier {
  cle: string;
  /** article (défaut) ; kilo : poids × prix au kg ; lot : forfait à prix fixe. */
  type?: TypeLigne;
  /** Mode kilo : poids pesé et poids minimum facturé. */
  poidsKg?: number;
  poidsMinKg?: number;
  /** Forfait : prix du lot et identifiant. */
  prixLot?: number;
  forfaitId?: string;
  /** Pièces incluses dans l'abonnement du client (facturées 0). */
  couvert?: boolean;
  articleId: string;
  serviceId: string;
  articleNom: string;
  serviceNom: string;
  quantite: number;
  /** Prix du catalogue, sans majoration express. */
  prixBase: number;
  majorationExpressPct: number;
  delaiJours: number;
  observations: string;
}

export type TypeRemise = "montant" | "pct";

/** Prix express arrondi à la dizaine supérieure : 1 500 + 50 % → 2 250 ; 1 333 → 1 340. */
export function prixExpress(prix: number, majorationPct: number): number {
  const brut = prix * (1 + majorationPct / 100);
  return Math.ceil(Math.round(brut * 100) / 100 / 10) * 10;
}

export function prixUnitaire(l: LignePanier, express: boolean): number {
  if (l.type === "lot") return 0;
  return express ? prixExpress(l.prixBase, l.majorationExpressPct) : l.prixBase;
}

/** Poids facturé : poids pesé, au moins le minimum (scénario 6 : 4,5 kg, minimum 5 → 5 kg). */
export function poidsFacture(l: Pick<LignePanier, "poidsKg" | "poidsMinKg">): number {
  const p = Math.max(l.poidsKg ?? 0, l.poidsMinKg ?? 0);
  return Math.round(p * 100) / 100;
}

export function totalLigne(l: LignePanier, express: boolean): number {
  if (l.couvert) return 0;
  if (l.type === "lot") return l.prixLot ?? 0;
  if (l.type === "kilo") return Math.round(prixUnitaire(l, express) * poidsFacture(l));
  return prixUnitaire(l, express) * l.quantite;
}

/**
 * Abonnement : les `couvert` premières pièces (lignes à l'article seulement) deviennent
 * « incluses » (0 FCFA) ; le reste est facturé au tarif normal (scénario 7 : 22 pièces, quota 20).
 */
export function repartirAbonnement(lignes: LignePanier[], couvert: number): LignePanier[] {
  let reste = Math.max(0, couvert);
  const r: LignePanier[] = [];
  for (const l of lignes) {
    if ((l.type ?? "article") !== "article" || l.couvert || reste === 0) {
      r.push(l);
      continue;
    }
    const pris = Math.min(reste, l.quantite);
    reste -= pris;
    r.push({ ...l, cle: `${l.cle}#abo`, quantite: pris, couvert: true });
    if (l.quantite > pris) r.push({ ...l, quantite: l.quantite - pris });
  }
  return r;
}

export function piecesArticle(lignes: LignePanier[]): number {
  return lignes
    .filter((l) => (l.type ?? "article") === "article" && !l.couvert)
    .reduce((a, l) => a + l.quantite, 0);
}

/** Détail d'une ligne enregistrée, pour le ticket et la fiche du dépôt. */
export function detailLigne(l: {
  quantite: number;
  prix_unitaire: number;
  poids_kg?: number | null;
  prix_lot?: number | null;
  couvert_abonnement?: boolean | null;
}): string {
  const f = (n: number) => formatFCFA(n, false);
  if (l.couvert_abonnement)
    return `${l.quantite} pièce${l.quantite > 1 ? "s" : ""} incluse${l.quantite > 1 ? "s" : ""} dans l’abonnement`;
  if (l.prix_lot != null) return `Lot de ${l.quantite} pièce${l.quantite > 1 ? "s" : ""}`;
  if (l.poids_kg != null)
    return `${String(l.poids_kg).replace(".", ",")} kg × ${f(l.prix_unitaire)} · ${l.quantite} pièce${l.quantite > 1 ? "s" : ""}`;
  return `${l.quantite} × ${f(l.prix_unitaire)}`;
}

export function sousTotal(lignes: LignePanier[], express: boolean): number {
  return lignes.reduce((a, l) => a + totalLigne(l, express), 0);
}

export function nombrePieces(lignes: LignePanier[]): number {
  return lignes.reduce((a, l) => a + l.quantite, 0);
}

/** Remise en FCFA, jamais supérieure au sous-total. */
export function montantRemise(sousTotalFcfa: number, type: TypeRemise, valeur: number): number {
  if (!valeur || valeur < 0) return 0;
  const m =
    type === "pct" ? Math.round((sousTotalFcfa * Math.min(valeur, 100)) / 100) : Math.round(valeur);
  return Math.min(m, sousTotalFcfa);
}

/** Pourcentage que représente une remise (pour le contrôle du plafond). */
export function pourcentageRemise(sousTotalFcfa: number, remise: number): number {
  if (sousTotalFcfa <= 0) return 0;
  return (remise / sousTotalFcfa) * 100;
}

/** Vrai si la remise dépasse le plafond (null = pas de plafond). Tolérance d'arrondi de 0,01 %. */
export function depassePlafond(
  sousTotalFcfa: number,
  remise: number,
  plafondPct: number | null,
): boolean {
  if (plafondPct === null || remise <= 0) return false;
  return pourcentageRemise(sousTotalFcfa, remise) > plafondPct + 0.01;
}

/** Date de retrait : plus grand délai des services du panier, 1 jour en express. */
export function dateRetraitPrevue(
  lignes: LignePanier[],
  express: boolean,
  depuis = new Date(),
): Date {
  const delai = express ? 1 : Math.max(1, ...lignes.map((l) => l.delaiJours));
  return ajouterJours(depuis, lignes.length ? delai : 2);
}

export function libelleLigne(l: Pick<LignePanier, "articleNom" | "serviceNom">): string {
  return `${l.articleNom} — ${l.serviceNom}`;
}

export const OBSERVATIONS_RAPIDES = [
  "Tache",
  "Bouton manquant",
  "Déchirure",
  "Décoloration",
  "Fermeture abîmée",
  "Délavé",
  "Fragile",
];
