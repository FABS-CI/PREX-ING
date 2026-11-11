/**
 * Calculs du comptoir. Ces montants servent à l'affichage pendant la saisie ;
 * les montants officiels du dépôt sont recalculés par la base (triggers).
 */
import { ajouterJours } from "./format";

export interface LignePanier {
  cle: string;
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
  return express ? prixExpress(l.prixBase, l.majorationExpressPct) : l.prixBase;
}

export function totalLigne(l: LignePanier, express: boolean): number {
  return prixUnitaire(l, express) * l.quantite;
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
