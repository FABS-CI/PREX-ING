import { describe, expect, it } from "vitest";

import { calculerRapport, ecartInventaire } from "@/hooks/useGestion";
import { versCsv } from "@/lib/export";
import { joursDe, periode } from "@/lib/periode";

describe("gestion", () => {
  it("calcule l'écart d'inventaire", () => {
    expect(ecartInventaire(8.5, 6)).toEqual({ type: "sortie", quantite: 2.5 });
    expect(ecartInventaire(2, 5)).toEqual({ type: "entree", quantite: 3 });
    expect(ecartInventaire(4, 4)).toBeNull();
  });

  it("donne les bornes des périodes", () => {
    const p = periode("mois_precedent", new Date(2026, 10, 11));
    expect([p.debut.getMonth(), p.fin.getMonth(), p.fin.getDate()]).toEqual([9, 10, 1]);
    expect(joursDe(periode("semaine", new Date(2026, 10, 11))).length).toBe(3); // lundi → mercredi
  });

  it("écrit un CSV lisible par Excel", () => {
    const csv = versCsv("Rapport", [
      { titre: "A", colonnes: ["x", "y"], lignes: [["a;b", 12500]] },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"a;b";12500');
  });

  it("calcule le rapport et le bénéfice simplifié", () => {
    const r = calculerRapport(
      [
        { id: "d1", net_a_payer: 8000, client_id: "c1", clients: { nom: "Awa" } },
        { id: "d2", net_a_payer: 2000, client_id: "c2", clients: { nom: "Koffi" } },
      ],
      [
        {
          total: 6000,
          quantite: 4,
          libelle: "Chemise — Nettoyage",
          article_id: "a",
          services: { nom: "Nettoyage" },
          depots: null,
        },
        {
          total: 4000,
          quantite: 1,
          libelle: "Boubou — Repassage",
          article_id: "b",
          services: { nom: "Repassage" },
          depots: null,
        },
      ],
      [
        {
          montant: 5000,
          moyen: "especes",
          statut: "valide",
          created_at: "2026-11-11T10:00:00",
          encaisse_par: "u1",
          profiles: { nom: "Awa" },
        },
        {
          montant: 3000,
          moyen: "wave",
          statut: "a_verifier",
          created_at: "2026-11-11T11:00:00",
          encaisse_par: "u1",
          profiles: { nom: "Awa" },
        },
      ],
      [{ montant: 1500, categorie: "produits", date: "2026-11-11" }],
      ["2026-11-10", "2026-11-11"],
      (m) => m,
    );
    expect([r.chiffreAffaires, r.encaissements, r.aVerifier, r.depenses, r.benefice]).toEqual([
      10000, 5000, 3000, 1500, 3500,
    ]);
    expect(r.topClients[0]?.libelle).toBe("Awa");
    expect(r.topArticles[0]?.libelle).toBe("Chemise");
    expect(r.parJour[1]).toEqual({ jour: "2026-11-11", encaissements: 5000, depenses: 1500 });
  });
});
