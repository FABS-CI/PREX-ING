/** Calcul du salaire du mois (V1 : pas de CNPS ni d'impôt, seulement les chiffres pour les faire). */

export type TypeRemuneration = "mensuel" | "journalier" | "piece" | "commission";

export const LIBELLES_REMUNERATION: Record<TypeRemuneration, string> = {
  mensuel: "Fixe mensuel",
  journalier: "Journalier",
  piece: "À la pièce",
  commission: "Commission (%)",
};

/** Jours ouvrables retenus pour la retenue d'une journée d'absence d'un salaire mensuel. */
export const JOURS_OUVRABLES = 26;

export interface Activite {
  joursPresence: number;
  joursAbsence: number;
  pieces: number;
  encaisse: number;
}

export interface CalculSalaire {
  base: number;
  retenues: number;
  avances: number;
  detail: string;
}

export function calculerSalaire(
  type: TypeRemuneration,
  montantBase: number,
  a: Activite,
  avancesNonDeduites: number,
): CalculSalaire {
  switch (type) {
    case "mensuel": {
      const retenues = Math.round((montantBase / JOURS_OUVRABLES) * a.joursAbsence);
      return {
        base: montantBase,
        retenues,
        avances: avancesNonDeduites,
        detail: a.joursAbsence
          ? `${a.joursAbsence} jour${a.joursAbsence > 1 ? "s" : ""} d’absence retenu${a.joursAbsence > 1 ? "s" : ""} (base ÷ ${JOURS_OUVRABLES})`
          : "Aucune absence",
      };
    }
    case "journalier":
      return {
        base: montantBase * a.joursPresence,
        retenues: 0,
        avances: avancesNonDeduites,
        detail: `${a.joursPresence} jour${a.joursPresence > 1 ? "s" : ""} travaillé${a.joursPresence > 1 ? "s" : ""}`,
      };
    case "piece":
      return {
        base: montantBase * a.pieces,
        retenues: 0,
        avances: avancesNonDeduites,
        detail: `${a.pieces} pièce${a.pieces > 1 ? "s" : ""} enregistrée${a.pieces > 1 ? "s" : ""}`,
      };
    case "commission":
      return {
        base: Math.round((a.encaisse * montantBase) / 100),
        retenues: 0,
        avances: avancesNonDeduites,
        detail: `${montantBase} % des encaissements`,
      };
  }
}

export const netSalaire = (base: number, primes: number, retenues: number, avances: number) =>
  base + primes - retenues - avances;

/** Premier jour du mois « AAAA-MM-01 » et premier jour du mois suivant. */
export function bornesMois(mois: string): { debut: string; fin: string } {
  const [a, m] = mois.split("-").map(Number);
  const fin = new Date(a ?? 2026, m ?? 1, 1);
  return {
    debut: `${mois.slice(0, 7)}-01`,
    fin: `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-01`,
  };
}

export function libelleMois(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  const t = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(a ?? 2026, (m ?? 1) - 1, 1),
  );
  return t.charAt(0).toUpperCase() + t.slice(1);
}
