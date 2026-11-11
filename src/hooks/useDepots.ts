import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ajouterJours, debutDuJourISO, normaliserTelephone } from "@/lib/format";
import type {
  Depot,
  DepotLigne,
  MoyenPaiement,
  Paiement,
  StatutDepot,
  StatutPaiementDepot,
} from "@/lib/types";

export type OngletDepots = "a_traiter" | "prets" | "retard" | "impayes" | "tous";
export type Periode = "tout" | "jour" | "7j" | "30j";
export const TAILLE_PAGE_DEPOTS = 50;

export interface FiltresDepots {
  boutiqueId: string;
  onglet: OngletDepots;
  recherche: string;
  periode: Periode;
  paiement: StatutPaiementDepot | "tous";
  page: number;
}

export type DepotListe = Depot & {
  clients: { nom: string; telephone: string } | null;
  depot_lignes: { quantite: number }[];
};

/** « A-B2-0043-2/5 » (étiquette scannée) → « A-B2-0043 ». */
export function numeroDepuisScan(texte: string): string {
  return texte
    .trim()
    .toUpperCase()
    .replace(/-\d+\/\d+$/, "");
}

function nettoyer(t: string) {
  return t.replace(/[,()*%\\]/g, " ").trim();
}

export function useDepots(f: FiltresDepots) {
  return useQuery({
    queryKey: ["depots", f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from("depots")
        .select("*, clients!inner(nom, telephone), depot_lignes(quantite)", { count: "exact" })
        .eq("boutique_id", f.boutiqueId)
        .is("deleted_at", null);

      if (f.onglet === "a_traiter") q = q.in("statut", ["recu", "en_traitement"]);
      if (f.onglet === "prets") q = q.eq("statut", "pret");
      if (f.onglet === "retard")
        q = q
          .lt("date_retrait_prevue", new Date().toISOString().slice(0, 10))
          .not("statut", "in", "(retire,annule)");
      if (f.onglet === "impayes") q = q.gt("reste_a_payer", 0).neq("statut", "annule");
      if (f.paiement !== "tous") q = q.eq("statut_paiement", f.paiement);
      if (f.periode !== "tout") {
        const jours = f.periode === "jour" ? 0 : f.periode === "7j" ? 6 : 29;
        q = q.gte("created_at", debutDuJourISO(ajouterJours(new Date(), -jours)));
      }

      const texte = nettoyer(f.recherche);
      if (texte) {
        const chiffres = normaliserTelephone(texte);
        if (/^[\d\s+]+$/.test(texte) && chiffres.length >= 3) {
          q = q.ilike("clients.telephone", `%${chiffres}%`);
        } else if (/\d/.test(texte) && /-/.test(texte)) {
          q = q.ilike("numero", `%${numeroDepuisScan(texte)}%`);
        } else {
          q = q.ilike("clients.nom", `%${texte}%`);
        }
      }

      q =
        f.onglet === "retard"
          ? q.order("date_retrait_prevue", { ascending: true })
          : q.order("created_at", { ascending: false });
      const debut = f.page * TAILLE_PAGE_DEPOTS;
      const { data, error, count } = await q.range(debut, debut + TAILLE_PAGE_DEPOTS - 1);
      if (error) throw error;
      return { depots: (data ?? []) as unknown as DepotListe[], total: count ?? 0 };
    },
  });
}

/** Retrouve un dépôt par son numéro exact (scan d'étiquette ou de ticket). */
export async function depotParNumero(boutiqueId: string, texte: string): Promise<string | null> {
  const { data } = await supabase
    .from("depots")
    .select("id")
    .eq("boutique_id", boutiqueId)
    .eq("numero", numeroDepuisScan(texte))
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export interface Historique {
  id: string;
  ancien: StatutDepot | null;
  nouveau: StatutDepot;
  created_at: string;
  profiles: { nom: string } | null;
}

export interface DepotDetail {
  depot: Depot & { retire_le: string | null; annule_motif: string | null };
  client: { id: string; nom: string; telephone: string; consentement_messages: boolean } | null;
  lignes: (DepotLigne & { statut: StatutDepot })[];
  paiements: Paiement[];
  historique: Historique[];
}

/** Numéro de la première pièce d'une étiquette « A-B2-0043-3/5 à 5/5 » → 3. */
function premierePiece(etiquette: string | null): number {
  const m = /-(\d+)\/\d+/.exec(etiquette ?? "");
  return m ? Number(m[1]) : 9999;
}

export function useDepot(id: string) {
  return useQuery({
    queryKey: ["depot", id],
    queryFn: async (): Promise<DepotDetail> => {
      const [depot, lignes, paiements, historique] = await Promise.all([
        supabase
          .from("depots")
          .select("*, clients(id, nom, telephone, consentement_messages)")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("depot_lignes").select("*").eq("depot_id", id).is("deleted_at", null),
        supabase.from("paiements").select("*").eq("depot_id", id).order("created_at"),
        supabase
          .from("depot_historique")
          .select("id, ancien, nouveau, created_at, profiles(nom)")
          .eq("depot_id", id)
          .order("created_at"),
      ]);
      for (const r of [depot, lignes, paiements, historique]) if (r.error) throw r.error;
      if (!depot.data) throw new Error("Dépôt introuvable.");
      const { clients, ...d } = depot.data as unknown as DepotDetail["depot"] & {
        clients: DepotDetail["client"];
      };
      return {
        depot: d,
        client: clients,
        lignes: ((lignes.data ?? []) as unknown as DepotDetail["lignes"]).sort(
          (a, b) => premierePiece(a.etiquette) - premierePiece(b.etiquette),
        ),
        paiements: (paiements.data ?? []) as unknown as Paiement[],
        historique: (historique.data ?? []) as unknown as Historique[],
      };
    },
  });
}

function useInvalider() {
  const qc = useQueryClient();
  return (depotId?: string) => {
    for (const k of [
      "depots",
      "tableau-de-bord",
      "client-depots",
      "client-paiements",
      "clients",
      "client",
    ]) {
      void qc.invalidateQueries({ queryKey: [k] });
    }
    if (depotId) void qc.invalidateQueries({ queryKey: ["depot", depotId] });
  };
}

export function useChangerStatut() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: StatutDepot }) => {
      const { error } = await supabase.from("depots").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => invalider(v.id),
  });
}

export function useModifierEmplacement() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({ id, emplacement }: { id: string; emplacement: string }) => {
      const { error } = await supabase
        .from("depots")
        .update({ emplacement: emplacement.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => invalider(v.id),
  });
}

export interface Encaissement {
  depot: Pick<Depot, "id" | "pressing_id" | "boutique_id" | "client_id">;
  montant: number;
  moyen: MoyenPaiement;
  reference: string;
}

export function useEncaisser() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async (e: Encaissement) => {
      const { error } = await supabase.from("paiements").insert({
        id: crypto.randomUUID(),
        pressing_id: e.depot.pressing_id,
        boutique_id: e.depot.boutique_id,
        depot_id: e.depot.id,
        client_id: e.depot.client_id,
        montant: e.montant,
        moyen: e.moyen,
        statut: e.moyen === "especes" ? "valide" : "a_verifier",
        reference_operateur: e.reference.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => invalider(v.depot.id),
  });
}

/** Remise au client de tout ou partie des pièces. */
export function useRetrait() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({
      depotId,
      ligneIds,
      toutes,
    }: {
      depotId: string;
      ligneIds: string[];
      toutes: boolean;
    }) => {
      if (ligneIds.length) {
        const { error } = await supabase
          .from("depot_lignes")
          .update({ statut: "retire" })
          .in("id", ligneIds);
        if (error) throw error;
      }
      if (toutes) {
        const { error } = await supabase
          .from("depots")
          .update({ statut: "retire", retire_le: new Date().toISOString() })
          .eq("id", depotId);
        if (error) throw error;
      }
    },
    onSuccess: (_r, v) => invalider(v.depotId),
  });
}

export function useAnnulerDepot() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({ id, motif }: { id: string; motif: string }) => {
      const { error } = await supabase
        .from("depots")
        .update({ statut: "annule", annule_motif: motif.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => invalider(v.id),
  });
}

export function useStatutPaiement() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({
      id,
      statut,
    }: {
      id: string;
      depotId: string;
      statut: "valide" | "annule";
    }) => {
      const { error } = await supabase.from("paiements").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => invalider(v.depotId),
  });
}
