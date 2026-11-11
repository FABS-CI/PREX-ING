import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatFCFA,
  formatTelephone,
  lienWhatsApp,
  nomAbrege,
  normaliserTelephone,
  remplirModele,
  telephoneValide,
} from "@/lib/format";

describe("format", () => {
  it("affiche les montants en FCFA avec espace insécable", () => {
    expect(formatFCFA(12500)).toBe("12\u00A0500\u00A0FCFA");
    expect(formatFCFA(0)).toBe("0\u00A0FCFA");
    expect(formatFCFA(1250000, false)).toBe("1\u00A0250\u00A0000");
    expect(formatFCFA(-500)).toBe("-500\u00A0FCFA");
  });

  it("affiche les dates JJ/MM/AAAA sans décalage de fuseau", () => {
    expect(formatDate("2026-11-05")).toBe("05/11/2026");
    expect(formatDate(null)).toBe("—");
  });

  it("valide et formate les téléphones ivoiriens", () => {
    expect(telephoneValide("07 07 07 07 07")).toBe(true);
    expect(telephoneValide("+225 0505050505")).toBe(true);
    expect(telephoneValide("0807070707")).toBe(false);
    expect(telephoneValide("070707")).toBe(false);
    expect(normaliserTelephone("+225 07-07-07-07-07")).toBe("0707070707");
    expect(formatTelephone("0707070707")).toBe("07 07 07 07 07");
    expect(lienWhatsApp("07 07 07 07 07")).toBe("https://wa.me/2250707070707");
  });

  it("remplit les modèles de messages", () => {
    expect(
      remplirModele("Bonjour {client}, dépôt {numero} {inconnu}", {
        client: "Awa",
        numero: "A-B2-0001",
      }),
    ).toBe("Bonjour Awa, dépôt A-B2-0001 {inconnu}");
  });

  it("abrège les noms pour les étiquettes", () => {
    expect(nomAbrege("Kouassi Aya Marie")).toBe("KOUASSI A.");
  });
});
