import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { debutDuJourISO } from "@/lib/format";

export interface DepotResume {
  id: string;
  numero: string;
  client_nom: string;
  net_a_payer: number;
  reste_a_payer: number;
  date_retrait_prevue: string | null;
  jours_retard?: number;
}

export interface TableauDeBord {
  depotsDuJour: number;
  articlesDuJour: number;
  encaissementsDuJour: number;
  aVerifierDuJour: number;
  prets: number;
  enRetard: DepotResume[];
  impayes: number;
  nbImpayes: number;
  derniersDepots: (DepotResume & { statut: string; created_at: string })[];
}

export function useTableauDeBord(pressingId: string, boutiqueId: string) {
  return useQuery({
    queryKey: ["tableau-de-bord", boutiqueId],
    refetchInterval: 60_000,
    queryFn: async (): Promise<TableauDeBord> => {
      const debut = debutDuJourISO();
      const [jour, paiements, prets, retard, impayes, derniers] = await Promise.all([
        supabase
          .from("depots")
          .select("id, depot_lignes(quantite)")
          .eq("boutique_id", boutiqueId)
          .is("deleted_at", null)
          .neq("statut", "annule")
          .gte("created_at", debut),
        supabase
          .from("paiements")
          .select("montant, statut")
          .eq("boutique_id", boutiqueId)
          .in("statut", ["valide", "a_verifier"])
          .gte("created_at", debut),
        supabase
          .from("depots")
          .select("id", { count: "exact", head: true })
          .eq("boutique_id", boutiqueId)
          .eq("statut", "pret")
          .is("deleted_at", null),
        supabase
          .from("v_depots_en_retard")
          .select(
            "id, numero, client_nom, net_a_payer, reste_a_payer, date_retrait_prevue, jours_retard",
          )
          .eq("boutique_id", boutiqueId)
          .order("jours_retard", { ascending: false })
          .limit(5),
        supabase
          .from("depots")
          .select("reste_a_payer")
          .eq("boutique_id", boutiqueId)
          .is("deleted_at", null)
          .neq("statut", "annule")
          .gt("reste_a_payer", 0),
        supabase
          .from("depots")
          .select(
            "id, numero, statut, net_a_payer, reste_a_payer, date_retrait_prevue, created_at, clients(nom)",
          )
          .eq("boutique_id", boutiqueId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      for (const r of [jour, paiements, prets, retard, impayes, derniers]) {
        if (r.error) throw r.error;
      }
      const depotsJour = (jour.data ?? []) as { depot_lignes: { quantite: number }[] }[];
      const lignesPaiement = (paiements.data ?? []) as { montant: number; statut: string }[];
      const restes = (impayes.data ?? []) as { reste_a_payer: number }[];
      type Dernier = Omit<TableauDeBord["derniersDepots"][number], "client_nom"> & {
        clients: { nom: string } | null;
      };
      return {
        depotsDuJour: depotsJour.length,
        articlesDuJour: depotsJour.reduce(
          (a, d) => a + (d.depot_lignes ?? []).reduce((b, l) => b + l.quantite, 0),
          0,
        ),
        encaissementsDuJour: lignesPaiement
          .filter((p) => p.statut === "valide")
          .reduce((a, p) => a + p.montant, 0),
        aVerifierDuJour: lignesPaiement
          .filter((p) => p.statut === "a_verifier")
          .reduce((a, p) => a + p.montant, 0),
        prets: prets.count ?? 0,
        enRetard: (retard.data ?? []) as DepotResume[],
        impayes: restes.reduce((a, d) => a + d.reste_a_payer, 0),
        nbImpayes: restes.length,
        derniersDepots: ((derniers.data ?? []) as unknown as Dernier[]).map(
          ({ clients, ...d }) => ({
            ...d,
            client_nom: clients?.nom ?? "—",
          }),
        ),
      };
    },
  });
}
