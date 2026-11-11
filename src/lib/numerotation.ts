/**
 * Numérotation des dépôts compatible hors ligne.
 * Format : {prefixe_boutique}-{code_appareil}-{compteur sur 4 chiffres}  → A-B2-0043
 * Chaque appareil a son propre code et son propre compteur : pas de collision sans Internet.
 * Étiquette d'une pièce : {numero}-{n° de pièce}/{nombre de pièces}       → A-B2-0043-2/5
 */
import { supabase } from "@/integrations/supabase/client";

const CLE_APPAREIL = "prexing.appareil";
const LETTRES = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I ni O (confusion avec 1 et 0)

function stockage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Code de cet appareil (2 caractères, ex. « B2 »), créé une seule fois. */
export function codeAppareil(): string {
  const s = stockage();
  const existant = s?.getItem(CLE_APPAREIL);
  if (existant && /^[A-Z][0-9]$/.test(existant)) return existant;
  const alea = new Uint8Array(2);
  crypto.getRandomValues(alea);
  const code = `${LETTRES[(alea[0] ?? 0) % LETTRES.length]}${(alea[1] ?? 0) % 10}`;
  s?.setItem(CLE_APPAREIL, code);
  return code;
}

export function definirCodeAppareil(code: string): void {
  if (!/^[A-Z][0-9]$/.test(code))
    throw new Error("Le code appareil doit être une lettre suivie d'un chiffre (ex. B2).");
  stockage()?.setItem(CLE_APPAREIL, code);
}

const cleCompteur = (boutiqueId: string, code: string) => `prexing.compteur.${boutiqueId}.${code}`;

export function racineNumero(prefixe: string, code = codeAppareil()): string {
  return `${prefixe}-${code}-`;
}

export function formaterNumero(prefixe: string, compteur: number, code = codeAppareil()): string {
  return `${racineNumero(prefixe, code)}${compteur.toString().padStart(4, "0")}`;
}

function lireCompteur(boutiqueId: string, code: string): number {
  return Number(stockage()?.getItem(cleCompteur(boutiqueId, code)) ?? 0) || 0;
}

export function enregistrerCompteur(
  boutiqueId: string,
  compteur: number,
  code = codeAppareil(),
): void {
  if (compteur > lireCompteur(boutiqueId, code)) {
    stockage()?.setItem(cleCompteur(boutiqueId, code), String(compteur));
  }
}

/** Extrait le compteur d'un numéro « A-B2-0043 » → 43. */
export function compteurDepuisNumero(numero: string): number {
  const m = /-(\d+)$/.exec(numero);
  return m ? Number(m[1]) : 0;
}

/**
 * Reprend le plus grand compteur connu (local ou en base) pour cet appareil.
 * À appeler à l'ouverture du comptoir ; sans Internet, le compteur local suffit.
 */
export async function synchroniserCompteur(boutiqueId: string, prefixe: string): Promise<number> {
  const code = codeAppareil();
  let max = lireCompteur(boutiqueId, code);
  try {
    const { data } = await supabase
      .from("depots")
      .select("numero")
      .eq("boutique_id", boutiqueId)
      .like("numero", `${racineNumero(prefixe, code)}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    for (const ligne of (data ?? []) as { numero: string }[]) {
      max = Math.max(max, compteurDepuisNumero(ligne.numero));
    }
  } catch {
    // Hors ligne : on garde le compteur local.
  }
  enregistrerCompteur(boutiqueId, max, code);
  return max;
}

/** Prochain numéro proposé (le compteur n'est enregistré qu'après un dépôt réussi). */
export function prochainNumero(
  boutiqueId: string,
  prefixe: string,
): { numero: string; compteur: number } {
  const compteur = lireCompteur(boutiqueId, codeAppareil()) + 1;
  return { numero: formaterNumero(prefixe, compteur), compteur };
}

/**
 * Étiquettes des pièces d'un dépôt. Pour des lignes de quantités [2, 3] :
 * ligne 1 → pièces 1 à 2, ligne 2 → pièces 3 à 5, sur un total de 5.
 */
export function etiquettesParLigne(
  numero: string,
  quantites: number[],
): { pieces: string[]; resume: string }[] {
  const total = quantites.reduce((a, q) => a + q, 0);
  let n = 0;
  return quantites.map((q) => {
    const pieces: string[] = [];
    for (let i = 0; i < q; i++) {
      n += 1;
      pieces.push(`${numero}-${n}/${total}`);
    }
    const resume = pieces.length <= 1 ? (pieces[0] ?? "") : `${pieces[0]} à ${n}/${total}`;
    return { pieces, resume };
  });
}
