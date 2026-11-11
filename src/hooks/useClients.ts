import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ajouterJours, normaliserTelephone } from "@/lib/format";
import type { AbonnementClient, Client, ClientSolde, Depot, Paiement } from "@/lib/types";

export type OngletClients = "tous" | "debiteurs" | "inactifs";
export const TAILLE_PAGE = 50;

/** Retire les caractères qui cassent la syntaxe des filtres PostgREST. */
function nettoyer(texte: string): string {
  return texte.replace(/[,()*%\\]/g, " ").trim();
}

export function useClients(
  pressingId: string,
  recherche: string,
  onglet: OngletClients,
  page: number,
) {
  return useQuery({
    queryKey: ["clients", pressingId, recherche, onglet, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from("v_clients_soldes")
        .select("*", { count: "exact" })
        .eq("pressing_id", pressingId);

      const texte = nettoyer(recherche);
      if (texte) {
        const chiffres = normaliserTelephone(texte);
        q =
          chiffres.length >= 3 && /^[\d\s+]+$/.test(texte)
            ? q.ilike("telephone", `%${chiffres}%`)
            : q.or(`nom.ilike.%${texte}%,telephone.ilike.%${chiffres || texte}%`);
      }
      if (onglet === "debiteurs") {
        q = q.gt("solde_du", 0).order("solde_du", { ascending: false });
      } else if (onglet === "inactifs") {
        const limite = ajouterJours(new Date(), -60).toISOString();
        q = q.or(`derniere_visite.is.null,derniere_visite.lt.${limite}`).order("nom");
      } else {
        q = q.order("nom");
      }
      const debut = page * TAILLE_PAGE;
      const { data, error, count } = await q.range(debut, debut + TAILLE_PAGE - 1);
      if (error) throw error;
      return { clients: (data ?? []) as ClientSolde[], total: count ?? 0 };
    },
  });
}

/** Recherche rapide pour le comptoir (10 résultats). */
export function useRechercheClients(pressingId: string, recherche: string) {
  return useQuery({
    queryKey: ["clients-recherche", pressingId, recherche],
    enabled: nettoyer(recherche).length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const texte = nettoyer(recherche);
      const chiffres = normaliserTelephone(texte);
      let q = supabase.from("v_clients_soldes").select("*").eq("pressing_id", pressingId);
      q = /^[\d\s+]+$/.test(texte)
        ? q.ilike("telephone", `%${chiffres}%`)
        : q.or(`nom.ilike.%${texte}%,telephone.ilike.%${chiffres || texte}%`);
      const { data, error } = await q
        .order("derniere_visite", { ascending: false, nullsFirst: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ClientSolde[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error("Client manquant");
      const [fiche, solde] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
        supabase.from("v_clients_soldes").select("*").eq("id", id).maybeSingle(),
      ]);
      if (fiche.error) throw fiche.error;
      if (solde.error) throw solde.error;
      return {
        client: fiche.data as Client | null,
        solde: solde.data as ClientSolde | null,
      };
    },
  });
}

export function useClientDepots(id: string) {
  return useQuery({
    queryKey: ["client-depots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depots")
        .select("*")
        .eq("client_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Depot[];
    },
  });
}

export function useClientPaiements(id: string) {
  return useQuery({
    queryKey: ["client-paiements", id],
    queryFn: async () => {
      // Paiements rattachés au client directement ou via ses dépôts.
      const { data: depots, error: e1 } = await supabase
        .from("depots")
        .select("id")
        .eq("client_id", id);
      if (e1) throw e1;
      const ids = ((depots ?? []) as { id: string }[]).map((d) => d.id);
      let q = supabase
        .from("paiements")
        .select("*, depots(numero)")
        .order("created_at", { ascending: false })
        .limit(200);
      q = ids.length
        ? q.or(`client_id.eq.${id},depot_id.in.(${ids.join(",")})`)
        : q.eq("client_id", id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as (Paiement & { depots: { numero: string } | null })[];
    },
  });
}

export function useClientAbonnements(id: string) {
  return useQuery({
    queryKey: ["client-abonnements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abonnements_clients")
        .select("*")
        .eq("client_id", id)
        .is("deleted_at", null)
        .order("debut", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AbonnementClient[];
    },
  });
}

export interface DonneesClient {
  nom: string;
  telephone: string;
  telephone2: string | null;
  adresse: string | null;
  quartier: string | null;
  notes: string | null;
  date_naissance: string | null;
  consentement_messages: boolean;
}

/** Retrouve le client qui possède déjà ce numéro (message de doublon). */
export async function clientParTelephone(pressingId: string, telephone: string) {
  const { data } = await supabase
    .from("clients")
    .select("id, nom")
    .eq("pressing_id", pressingId)
    .eq("telephone", normaliserTelephone(telephone))
    .is("deleted_at", null)
    .maybeSingle();
  return data as { id: string; nom: string } | null;
}

function invaliderClients(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: ["clients"] });
  void qc.invalidateQueries({ queryKey: ["clients-recherche"] });
  if (id) void qc.invalidateQueries({ queryKey: ["client", id] });
}

export function useCreerClient(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: DonneesClient) => {
      const id = crypto.randomUUID();
      const { data, error } = await supabase
        .from("clients")
        .insert({ id, pressing_id: pressingId, ...d, telephone: normaliserTelephone(d.telephone) })
        .select("*")
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => invaliderClients(qc),
  });
}

export function useModifierClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: DonneesClient & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ ...d, telephone: normaliserTelephone(d.telephone) })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (c) => invaliderClients(qc, c.id),
  });
}

export function useSupprimerClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, id) => invaliderClients(qc, id),
  });
}
