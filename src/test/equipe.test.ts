import { describe, expect, it } from "vitest";

import { calculerRapport } from "@/hooks/useGestion";
import { bornesMois, calculerSalaire, netSalaire } from "@/lib/salaire";

describe("salaires", () => {
  it("scénario 12 : salaire mensuel avec une absence et une avance", () => {
    const c = calculerSalaire(
      "mensuel",
      60000,
      { joursPresence: 25, joursAbsence: 1, pieces: 0, encaisse: 0 },
      10000,
    );
    expect([c.base, c.retenues, c.avances]).toEqual([60000, 2308, 10000]);
    expect(netSalaire(c.base, 5000, c.retenues, c.avances)).toBe(52692);
  });

  it("calcule les autres rémunérations", () => {
    const a = { joursPresence: 20, joursAbsence: 0, pieces: 340, encaisse: 500000 };
    expect(calculerSalaire("journalier", 3000, a, 0).base).toBe(60000);
    expect(calculerSalaire("piece", 150, a, 0).base).toBe(51000);
    expect(calculerSalaire("commission", 5, a, 0).base).toBe(25000);
  });

  it("donne les bornes du mois", () => {
    expect(bornesMois("2026-12")).toEqual({ debut: "2026-12-01", fin: "2027-01-01" });
  });

  it("déduit les salaires du bénéfice", () => {
    const r = calculerRapport(
      [],
      [],
      [
        {
          montant: 100000,
          moyen: "especes",
          statut: "valide",
          created_at: "2026-11-11T10:00:00",
          encaisse_par: null,
          profiles: null,
        },
      ],
      [{ montant: 20000, categorie: "loyer", date: "2026-11-11" }],
      [],
      (m) => m,
      [{ net: 47692 }],
    );
    expect([r.salaires, r.benefice]).toEqual([47692, 32308]);
  });
});

describe("livraisons", () => {
  it("frais de zone, gratuité, code et itinéraire", async () => {
    const { fraisPour, nouveauCode, lienItineraire } = await import("@/hooks/useLivraisons");
    const zone = { id: "z", nom: "Cocody", communes: [], frais: 1000, seuil_gratuite: 15000 };
    expect([fraisPour(zone, 14999), fraisPour(zone, 15000), fraisPour(undefined, 0)]).toEqual([
      1000, 0, 0,
    ]);
    expect(nouveauCode()).toMatch(/^[1-9]\d{3}$/);
    expect(lienItineraire("Angré 8e tranche")).toContain("destination=Angr%C3%A9%208e%20tranche");
  });
});
