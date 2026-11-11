import { describe, expect, it } from "vitest";

import {
  dateRetraitPrevue,
  depassePlafond,
  montantRemise,
  prixExpress,
  sousTotal,
  type LignePanier,
} from "@/lib/comptoir";
import { compteurDepuisNumero, etiquettesParLigne, formaterNumero } from "@/lib/numerotation";

const ligne = (p: Partial<LignePanier>): LignePanier => ({
  cle: "a|s",
  articleId: "a",
  serviceId: "s",
  articleNom: "Chemise",
  serviceNom: "Nettoyage complet",
  quantite: 1,
  prixBase: 1000,
  majorationExpressPct: 50,
  delaiJours: 2,
  observations: "",
  ...p,
});

describe("comptoir", () => {
  it("calcule le prix express arrondi à la dizaine supérieure", () => {
    expect(prixExpress(1500, 50)).toBe(2250);
    expect(prixExpress(1333, 0)).toBe(1340);
    expect(prixExpress(1000, 33)).toBe(1330);
  });

  it("calcule le sous-total (scénario 1 : 5 articles)", () => {
    const lignes = [
      ligne({ cle: "1", quantite: 3 }),
      ligne({ cle: "2", quantite: 2, prixBase: 2500 }),
    ];
    expect(sousTotal(lignes, false)).toBe(8000);
    expect(sousTotal(lignes, true)).toBe(3 * 1500 + 2 * 3750);
  });

  it("plafonne la remise au sous-total et la convertit en %", () => {
    expect(montantRemise(8000, "pct", 10)).toBe(800);
    expect(montantRemise(8000, "montant", 9000)).toBe(8000);
    expect(montantRemise(8000, "montant", 0)).toBe(0);
  });

  it("refuse une remise au-delà du plafond du caissier (scénario 8)", () => {
    expect(depassePlafond(10000, 1000, 10)).toBe(false);
    expect(depassePlafond(10000, 1100, 10)).toBe(true);
    expect(depassePlafond(10000, 5000, null)).toBe(false);
  });

  it("calcule la date de retrait selon le plus long délai", () => {
    const depuis = new Date(2026, 10, 11);
    expect(
      dateRetraitPrevue(
        [ligne({ delaiJours: 2 }), ligne({ delaiJours: 5 })],
        false,
        depuis,
      ).getDate(),
    ).toBe(16);
    expect(dateRetraitPrevue([ligne({ delaiJours: 5 })], true, depuis).getDate()).toBe(12);
  });
});

describe("numérotation", () => {
  it("formate les numéros par appareil", () => {
    expect(formaterNumero("A", 43, "B2")).toBe("A-B2-0043");
    expect(compteurDepuisNumero("A-B2-0043")).toBe(43);
  });

  it("numérote les étiquettes de 1/5 à 5/5", () => {
    const e = etiquettesParLigne("A-B2-0043", [2, 3]);
    expect(e[0]?.pieces).toEqual(["A-B2-0043-1/5", "A-B2-0043-2/5"]);
    expect(e[1]?.pieces).toEqual(["A-B2-0043-3/5", "A-B2-0043-4/5", "A-B2-0043-5/5"]);
    expect(e[1]?.resume).toBe("A-B2-0043-3/5 à 5/5");
    expect(etiquettesParLigne("A-B2-0001", [1])[0]?.resume).toBe("A-B2-0001-1/1");
  });
});

describe("scan d'étiquette", () => {
  it("retrouve le numéro du dépôt depuis une étiquette", async () => {
    const { numeroDepuisScan } = await import("@/hooks/useDepots");
    expect(numeroDepuisScan("a-b2-0043-2/5")).toBe("A-B2-0043");
    expect(numeroDepuisScan("A-B2-0043")).toBe("A-B2-0043");
  });
});
