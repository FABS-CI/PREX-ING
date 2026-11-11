import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { MoyenPaiement, Paiement } from "@/lib/types";

export interface SessionCaisse {
  id: string;
  pressing_id: string;
  boutique_id: string;
  ouvert_le: string;
  fond_initial: number;
  cloture_le: string | null;
  montant_theorique: number | null;
  montant_compte: number | null;
  ecart: number | null;
  commentaire: string | null;
  statut: "ouverte" | "cloturee";
  ouvreur: { nom: string } | null;
  clotureur: { nom: string } | null;
}

export interface MouvementCaisse {
  id: string;
  type: "entree" | "sortie";
  montant: number;
  motif: string;
  created_at: string;
  profiles: { nom: string } | null;
}

export interface ResumeSession {
  especes: number;
  entrees: number;
  sorties: number;
  theorique: number;
  parMoyen: { moyen: MoyenPaiement; valide: number; aVerifier: number; nombre: number }[];
  mouvements: MouvementCaisse[];
  paiements: (Paiement & { depots: { numero: string } | null })[];
}

const SELECT_SESSION =
  "*, ouvreur:profiles!sessions_caisse_ouvert_par_fkey(nom), clotureur:profiles!sessions_caisse_cloture_par_fkey(nom)";

/** Session ouverte de la boutique (null si la caisse est fermée). */
export function useSessionOuverte(boutiqueId: string) {
  return useQuery({
    queryKey: ["caisse-session", boutiqueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_caisse")
        .select(SELECT_SESSION)
        .eq("boutique_id", boutiqueId)
        .eq("statut", "ouverte")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as SessionCaisse | null;
    },
  });
}

/** Calcul pur du résumé (exporté pour les tests). */
export function calculerResume(
  fond: number,
  paiements: { moyen: MoyenPaiement; statut: string; montant: number }[],
  mouvements: { type: "entree" | "sortie"; montant: number }[],
) {
  const especes = paiements
    .filter((p) => p.moyen === "especes" && p.statut === "valide")
    .reduce((a, p) => a + p.montant, 0);
  const entrees = mouvements.filter((m) => m.type === "entree").reduce((a, m) => a + m.montant, 0);
  const sorties = mouvements.filter((m) => m.type === "sortie").reduce((a, m) => a + m.montant, 0);
  const map = new Map<
    MoyenPaiement,
    { moyen: MoyenPaiement; valide: number; aVerifier: number; nombre: number }
  >();
  for (const p of paiements) {
    if (p.statut !== "valide" && p.statut !== "a_verifier") continue;
    const l = map.get(p.moyen) ?? { moyen: p.moyen, valide: 0, aVerifier: 0, nombre: 0 };
    if (p.statut === "valide") l.valide += p.montant;
    else l.aVerifier += p.montant;
    l.nombre += 1;
    map.set(p.moyen, l);
  }
  return {
    especes,
    entrees,
    sorties,
    theorique: fond + especes + entrees - sorties,
    parMoyen: [...map.values()],
  };
}

export function useResumeSession(session: SessionCaisse | null | undefined) {
  return useQuery({
    queryKey: ["caisse-resume", session?.id],
    enabled: Boolean(session),
    refetchInterval: 30_000,
    queryFn: async (): Promise<ResumeSession> => {
      if (!session) throw new Error("Aucune session.");
      const [pai, mvt] = await Promise.all([
        supabase
          .from("paiements")
          .select("*, depots(numero)")
          .eq("session_caisse_id", session.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("mouvements_caisse")
          .select("id, type, montant, motif, created_at, profiles(nom)")
          .eq("session_caisse_id", session.id)
          .order("created_at", { ascending: false }),
      ]);
      if (pai.error) throw pai.error;
      if (mvt.error) throw mvt.error;
      const paiements = (pai.data ?? []) as unknown as ResumeSession["paiements"];
      const mouvements = (mvt.data ?? []) as unknown as MouvementCaisse[];
      return {
        ...calculerResume(session.fond_initial, paiements, mouvements),
        mouvements,
        paiements,
      };
    },
  });
}

export function useHistoriqueCaisse(boutiqueId: string) {
  return useQuery({
    queryKey: ["caisse-historique", boutiqueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_caisse")
        .select(SELECT_SESSION)
        .eq("boutique_id", boutiqueId)
        .eq("statut", "cloturee")
        .order("cloture_le", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as SessionCaisse[];
    },
  });
}

export function usePaiementsAVerifier(boutiqueId: string) {
  return useQuery({
    queryKey: ["caisse-a-verifier", boutiqueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*, depots(id, numero, clients(nom))")
        .eq("boutique_id", boutiqueId)
        .eq("statut", "a_verifier")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as (Paiement & {
        depots: { id: string; numero: string; clients: { nom: string } | null } | null;
      })[];
    },
  });
}

function useInvaliderCaisse() {
  const qc = useQueryClient();
  return () => {
    for (const k of [
      "caisse-session",
      "caisse-resume",
      "caisse-historique",
      "caisse-a-verifier",
      "tableau-de-bord",
      "depot",
      "depots",
    ]) {
      void qc.invalidateQueries({ queryKey: [k] });
    }
  };
}

export function useOuvrirCaisse() {
  const invalider = useInvaliderCaisse();
  return useMutation({
    mutationFn: async (p: { pressingId: string; boutiqueId: string; fond: number }) => {
      const { error } = await supabase.from("sessions_caisse").insert({
        id: crypto.randomUUID(),
        pressing_id: p.pressingId,
        boutique_id: p.boutiqueId,
        fond_initial: p.fond,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

export function useMouvementCaisse() {
  const invalider = useInvaliderCaisse();
  return useMutation({
    mutationFn: async (p: {
      session: SessionCaisse;
      type: "entree" | "sortie";
      montant: number;
      motif: string;
    }) => {
      const { error } = await supabase.from("mouvements_caisse").insert({
        id: crypto.randomUUID(),
        pressing_id: p.session.pressing_id,
        boutique_id: p.session.boutique_id,
        session_caisse_id: p.session.id,
        type: p.type,
        montant: p.montant,
        motif: p.motif.trim(),
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

type RpcLibre = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;

export function useCloturerCaisse() {
  const invalider = useInvaliderCaisse();
  return useMutation({
    mutationFn: async (p: { sessionId: string; compte: number; commentaire: string }) => {
      // Fonction ajoutée par la migration 20261111000003_caisse.sql.
      const rpc = supabase.rpc.bind(supabase) as unknown as RpcLibre;
      const { data, error } = await rpc("cloturer_caisse", {
        p_session: p.sessionId,
        p_montant_compte: p.compte,
        p_commentaire: p.commentaire.trim() || null,
      });
      if (error) throw error;
      return data as SessionCaisse;
    },
    onSuccess: invalider,
  });
}

export function useStatutPaiementCaisse() {
  const invalider = useInvaliderCaisse();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: "valide" | "annule" }) => {
      const { error } = await supabase.from("paiements").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}
