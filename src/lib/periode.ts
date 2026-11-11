import { ajouterJours, toISODate } from "./format";

export type CodePeriode = "jour" | "semaine" | "mois" | "mois_precedent" | "annee";

export interface Periode {
  debut: Date; // inclus, début de journée locale
  fin: Date; // exclu, début du jour suivant
  libelle: string;
}

const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function periode(code: CodePeriode, maintenant = new Date()): Periode {
  const auj = jour(maintenant);
  const demain = ajouterJours(auj, 1);
  switch (code) {
    case "jour":
      return { debut: auj, fin: demain, libelle: "Aujourd’hui" };
    case "semaine": {
      const lundi = ajouterJours(auj, -((auj.getDay() + 6) % 7));
      return { debut: lundi, fin: demain, libelle: "Cette semaine" };
    }
    case "mois":
      return {
        debut: new Date(auj.getFullYear(), auj.getMonth(), 1),
        fin: demain,
        libelle: "Ce mois-ci",
      };
    case "mois_precedent": {
      const debut = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
      const fin = new Date(auj.getFullYear(), auj.getMonth(), 1);
      return { debut, fin, libelle: "Le mois dernier" };
    }
    case "annee":
      return { debut: new Date(auj.getFullYear(), 0, 1), fin: demain, libelle: "Cette année" };
  }
}

/** Bornes ISO pour les colonnes timestamptz et date. */
export function bornes(p: Periode) {
  return {
    debutTs: p.debut.toISOString(),
    finTs: p.fin.toISOString(),
    debutDate: toISODate(p.debut),
    finDate: toISODate(p.fin),
  };
}

/** Jours de la période (pour les graphiques par jour). */
export function joursDe(p: Periode): string[] {
  const r: string[] = [];
  for (let d = new Date(p.debut); d < p.fin; d = ajouterJours(d, 1)) r.push(toISODate(d));
  return r;
}
