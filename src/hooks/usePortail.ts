import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { rpcLibre } from "@/hooks/useModesAvances";
import type { StatutDepot, StatutPaiementDepot } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export interface PagePressing {
  id: string;
  nom: string;
  telephone: string | null;
  logo_url: string | null;
  slug: string;
  boutiques: {
    id: string;
    nom: string;
    adresse: string | null;
    commune: string | null;
    telephone: string | null;
  }[];
  tarifs: { categorie: string | null; article: string; service: string; prix: number }[];
  services: { nom: string; delai_jours: number }[];
  kilo: { service: string; prix_kg: number; poids_min: number }[];
  zones: { nom: string; communes: string[]; frais: number; seuil_gratuite: number | null }[];
}

export interface SuiviDepot {
  numero: string;
  statut: StatutDepot;
  statut_paiement: StatutPaiementDepot;
  express: boolean;
  depose_le: string;
  retrait_prevu: string | null;
  retire_le: string | null;
  net_a_payer: number;
  deja_paye: number;
  reste_a_payer: number;
  client: string;
  pressing: { nom: string; slug: string | null };
  boutique: {
    nom: string;
    adresse: string | null;
    commune: string | null;
    telephone: string | null;
  };
  lignes: { libelle: string; quantite: number }[];
  livraison: {
    type: "ramassage" | "livraison";
    statut: string;
    creneau_debut: string | null;
    creneau_fin: string | null;
  } | null;
}

/** Adresses publiques (même domaine que l'application). */
export const lienPagePressing = (slug: string) => `${window.location.origin}/p/${slug}`;
export const lienSuivi = (jeton: string) => `${window.location.origin}/suivi/${jeton}`;

export function usePagePressing(slug: string) {
  return useQuery({
    queryKey: ["page-pressing", slug],
    queryFn: async () => {
      const { data, error } = await rpcLibre("page_pressing", { p_slug: slug });
      if (error) throw error;
      return (data ?? null) as PagePressing | null;
    },
  });
}

export function useSuivi(jeton: string) {
  return useQuery({
    queryKey: ["suivi", jeton],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await rpcLibre("suivi_depot", { p_jeton: jeton });
      if (error) throw error;
      return (data ?? null) as SuiviDepot | null;
    },
  });
}

export function useDemanderRamassage() {
  return useMutation({
    mutationFn: async (p: {
      slug: string;
      boutiqueId: string;
      nom: string;
      telephone: string;
      adresse: string;
      repere: string;
      jour: string;
      creneau: string;
      note: string;
    }) => {
      const { error } = await rpcLibre("demander_ramassage", {
        p_slug: p.slug,
        p_boutique: p.boutiqueId,
        p_nom: p.nom,
        p_telephone: p.telephone,
        p_adresse: p.adresse,
        p_repere: p.repere || null,
        p_jour: p.jour,
        p_creneau: p.creneau,
        p_note: p.note || null,
      });
      if (error) throw error;
    },
  });
}

export interface CommandeEnLigne {
  id: string;
  client_id: string | null;
  adresse: string | null;
  creneau: string | null;
  statut: "nouvelle" | "confirmee" | "convertie" | "annulee";
  articles: { note?: string; repere?: string }[];
  created_at: string;
  clients: { nom: string; telephone: string } | null;
}

export function useCommandesEnLigne(boutiqueId: string, toutes: boolean) {
  return useQuery({
    queryKey: ["commandes-en-ligne", boutiqueId, toutes],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = db
        .from("commandes_en_ligne")
        .select(
          "id, client_id, adresse, creneau, statut, articles, created_at, clients(nom, telephone)",
        )
        .eq("boutique_id", boutiqueId);
      if (!toutes) q = q.in("statut", ["nouvelle", "confirmee"]);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as CommandeEnLigne[];
    },
  });
}

export function useStatutCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: CommandeEnLigne["statut"] }) => {
      const { error } = await db.from("commandes_en_ligne").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["commandes-en-ligne"] }),
  });
}

export function useSlugPressing(pressingId: string) {
  return useQuery({
    queryKey: ["slug", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("pressings")
        .select("slug")
        .eq("id", pressingId)
        .single();
      if (error) throw error;
      return (data as { slug: string | null }).slug;
    },
  });
}

export function useModifierSlug(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await db.from("pressings").update({ slug }).eq("id", pressingId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["slug", pressingId] }),
  });
}

export function useModifierBoutique() {
  return useMutation({
    mutationFn: async (b: {
      id: string;
      nom: string;
      adresse: string;
      commune: string;
      telephone: string;
      pied_ticket: string;
    }) => {
      const { id, ...champs } = b;
      const { error } = await db
        .from("boutiques")
        .update({
          nom: champs.nom.trim(),
          adresse: champs.adresse.trim() || null,
          commune: champs.commune.trim() || null,
          telephone: champs.telephone.replace(/\D/g, "") || null,
          pied_ticket: champs.pied_ticket.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
  });
}
