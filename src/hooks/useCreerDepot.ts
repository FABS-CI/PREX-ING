import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { estDoublon } from "@/lib/erreurs";
import { libelleLigne, prixUnitaire, type LignePanier } from "@/lib/comptoir";
import { toISODate } from "@/lib/format";
import { enregistrerCompteur, etiquettesParLigne, prochainNumero } from "@/lib/numerotation";
import type { Depot, DepotLigne, MoyenPaiement, Paiement } from "@/lib/types";

export interface NouveauDepot {
  pressingId: string;
  boutiqueId: string;
  prefixe: string;
  clientId: string;
  lignes: LignePanier[];
  express: boolean;
  remise: number;
  dateRetrait: Date;
  emplacement: string;
  observations: string;
  avance: number;
  moyen: MoyenPaiement;
  reference: string;
}

export interface DepotCree {
  depot: Depot;
  lignes: DepotLigne[];
  paiement: Paiement | null;
  /** Toutes les étiquettes, dans l'ordre, avec le libellé de la ligne. */
  etiquettes: { code: string; libelle: string }[];
}

const TENTATIVES = 8;

/** Enregistre un dépôt complet : dépôt, lignes avec étiquettes, avance éventuelle. */
export async function creerDepot(d: NouveauDepot): Promise<DepotCree> {
  const depotId = crypto.randomUUID();

  // 1. Le dépôt, avec un numéro propre à cet appareil (nouvel essai si le numéro existe déjà).
  let numero = "";
  for (let essai = 0; essai < TENTATIVES; essai++) {
    const p = prochainNumero(d.boutiqueId, d.prefixe);
    const { error } = await supabase.from("depots").insert({
      id: depotId,
      pressing_id: d.pressingId,
      boutique_id: d.boutiqueId,
      client_id: d.clientId,
      numero: p.numero,
      mode: "article",
      remise: d.remise,
      express: d.express,
      date_retrait_prevue: toISODate(d.dateRetrait),
      emplacement: d.emplacement.trim() || null,
      observations: d.observations.trim() || null,
    });
    if (!error) {
      numero = p.numero;
      enregistrerCompteur(d.boutiqueId, p.compteur);
      break;
    }
    if (estDoublon(error)) {
      enregistrerCompteur(d.boutiqueId, p.compteur);
      continue;
    }
    throw error;
  }
  if (!numero) throw new Error("Impossible d’attribuer un numéro de dépôt. Réessayez.");

  // 2. Les lignes, avec leurs étiquettes.
  const etiquettes = etiquettesParLigne(
    numero,
    d.lignes.map((l) => l.quantite),
  );
  const lignes = d.lignes.map((l, i) => ({
    id: crypto.randomUUID(),
    pressing_id: d.pressingId,
    boutique_id: d.boutiqueId,
    depot_id: depotId,
    article_id: l.articleId,
    service_id: l.serviceId,
    libelle: libelleLigne(l),
    quantite: l.quantite,
    prix_unitaire: prixUnitaire(l, d.express),
    observations: l.observations.trim() || null,
    etiquette: etiquettes[i]?.resume ?? null,
  }));
  const resLignes = await supabase.from("depot_lignes").insert(lignes);
  if (resLignes.error) {
    // Le dépôt sans lignes serait incohérent : on le retire (suppression logique).
    await supabase
      .from("depots")
      .update({ deleted_at: new Date().toISOString(), statut: "annule" })
      .eq("id", depotId);
    throw resLignes.error;
  }

  // 3. L'avance éventuelle. Mobile money saisi à la main = « à vérifier ».
  let paiement: Paiement | null = null;
  if (d.avance > 0) {
    const { data, error } = await supabase
      .from("paiements")
      .insert({
        id: crypto.randomUUID(),
        pressing_id: d.pressingId,
        boutique_id: d.boutiqueId,
        depot_id: depotId,
        client_id: d.clientId,
        montant: d.avance,
        moyen: d.moyen,
        statut: d.moyen === "especes" ? "valide" : "a_verifier",
        reference_operateur: d.reference.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw Object.assign(error, { depotCree: numero });
    paiement = data as Paiement;
  }

  // 4. Relecture : les montants officiels viennent de la base.
  const [relu, relues] = await Promise.all([
    supabase.from("depots").select("*").eq("id", depotId).single(),
    supabase.from("depot_lignes").select("*").eq("depot_id", depotId).order("created_at"),
  ]);
  if (relu.error) throw relu.error;
  const lignesRelues = ((relues.data ?? []) as DepotLigne[]).sort(
    (a, b) => lignes.findIndex((l) => l.id === a.id) - lignes.findIndex((l) => l.id === b.id),
  );

  return {
    depot: relu.data as Depot,
    lignes: lignesRelues,
    paiement,
    etiquettes: d.lignes.flatMap((l, i) =>
      (etiquettes[i]?.pieces ?? []).map((code) => ({ code, libelle: libelleLigne(l) })),
    ),
  };
}

export function useCreerDepot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: creerDepot,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tableau-de-bord"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
      void qc.invalidateQueries({ queryKey: ["client"] });
      void qc.invalidateQueries({ queryKey: ["client-depots"] });
    },
  });
}

export async function modeleMessage(pressingId: string, code: string): Promise<string | null> {
  const { data } = await supabase
    .from("modeles_messages")
    .select("contenu")
    .eq("pressing_id", pressingId)
    .eq("code", code)
    .eq("canal", "whatsapp")
    .eq("actif", true)
    .maybeSingle();
  return (data as { contenu: string } | null)?.contenu ?? null;
}
