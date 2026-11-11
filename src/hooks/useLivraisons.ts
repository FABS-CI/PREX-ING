import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { rpcLibre } from "@/hooks/useModesAvances";
import type { MoyenPaiement } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export type StatutLivraison =
  "demande" | "planifie" | "en_cours" | "effectue" | "echoue" | "annule";
export type TypeLivraison = "ramassage" | "livraison";

export const LIBELLES_STATUT_LIVRAISON: Record<StatutLivraison, string> = {
  demande: "À planifier",
  planifie: "Planifiée",
  en_cours: "En route",
  effectue: "Effectuée",
  echoue: "Échec",
  annule: "Annulée",
};

export interface Zone {
  id: string;
  nom: string;
  communes: string[];
  frais: number;
  seuil_gratuite: number | null;
}

export interface Course {
  id: string;
  boutique_id: string;
  depot_id: string | null;
  client_id: string;
  type: TypeLivraison;
  adresse: string;
  repere: string | null;
  zone_id: string | null;
  creneau_debut: string | null;
  creneau_fin: string | null;
  livreur_id: string | null;
  statut: StatutLivraison;
  frais: number;
  code_confirmation: string | null;
  motif_echec: string | null;
  created_at: string;
  clients: { nom: string; telephone: string; consentement_messages?: boolean } | null;
  depots: { numero: string; reste_a_payer: number; net_a_payer: number } | null;
  zones_livraison: { nom: string } | null;
  livreur: { nom: string } | null;
}

/** Frais de la zone, offerts au-delà du seuil de gratuité. */
export function fraisPour(zone: Zone | undefined, montantDepot: number): number {
  if (!zone) return 0;
  if (zone.seuil_gratuite != null && montantDepot >= zone.seuil_gratuite) return 0;
  return zone.frais;
}

/** Code à 4 chiffres que le client donne au livreur. */
export function nouveauCode(): string {
  const a = new Uint16Array(1);
  crypto.getRandomValues(a);
  return String(1000 + ((a[0] ?? 0) % 9000));
}

/** Lien d'itinéraire (Google Maps) vers l'adresse saisie. */
export function lienItineraire(adresse: string, commune?: string | null): string {
  const q = [adresse, commune, "Abidjan", "Côte d’Ivoire"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

const SELECT_COURSE =
  "*, clients(nom, telephone, consentement_messages), depots(numero, reste_a_payer, net_a_payer), zones_livraison(nom), livreur:profiles!livraisons_livreur_id_fkey(nom)";

export function useZones(pressingId: string) {
  return useQuery({
    queryKey: ["zones", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("zones_livraison")
        .select("id, nom, communes, frais, seuil_gratuite")
        .eq("pressing_id", pressingId)
        .is("deleted_at", null)
        .order("frais");
      if (error) throw error;
      return (data ?? []) as Zone[];
    },
  });
}

export function useEnregistrerZone(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (z: {
      nom: string;
      communes: string[];
      frais: number;
      seuil: number | null;
    }) => {
      const { error } = await db.from("zones_livraison").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        nom: z.nom.trim(),
        communes: z.communes,
        frais: z.frais,
        seuil_gratuite: z.seuil,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["zones", pressingId] }),
  });
}

export function useSupprimerZone(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("zones_livraison")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["zones", pressingId] }),
  });
}

/** Courses de la boutique (comptoir) : en cours et des 7 derniers jours. */
export function useCourses(boutiqueId: string, terminees: boolean) {
  return useQuery({
    queryKey: ["courses", boutiqueId, terminees],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = db
        .from("livraisons")
        .select(SELECT_COURSE)
        .eq("boutique_id", boutiqueId)
        .is("deleted_at", null);
      q = terminees
        ? q
            .in("statut", ["effectue", "echoue", "annule"])
            .gte("updated_at", new Date(Date.now() - 7 * 864e5).toISOString())
        : q.in("statut", ["demande", "planifie", "en_cours", "echoue"]);
      const { data, error } = await q
        .order("creneau_debut", { ascending: true, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

/** Tournée du livreur connecté. */
export function useMaTournee(userId: string) {
  return useQuery({
    queryKey: ["tournee", userId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("livraisons")
        .select(SELECT_COURSE.replace(", livreur:profiles!livraisons_livreur_id_fkey(nom)", ""))
        .eq("livreur_id", userId)
        .in("statut", ["planifie", "en_cours"])
        .is("deleted_at", null)
        .order("creneau_debut", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

export function useLivreurs(pressingId: string) {
  return useQuery({
    queryKey: ["livreurs", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("memberships")
        .select("user_id, profiles(nom)")
        .eq("pressing_id", pressingId)
        .eq("role", "livreur")
        .eq("actif", true);
      if (error) throw error;
      return ((data ?? []) as { user_id: string; profiles: { nom: string } | null }[]).map((m) => ({
        id: m.user_id,
        nom: m.profiles?.nom ?? "Livreur",
      }));
    },
  });
}

function useInvalider() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["courses", "tournee", "depot", "depots", "tableau-de-bord", "caisse-resume"])
      void qc.invalidateQueries({ queryKey: [k] });
  };
}

export interface NouvelleCourse {
  pressingId: string;
  boutiqueId: string;
  clientId: string;
  type: TypeLivraison;
  depotId: string | null;
  adresse: string;
  repere: string;
  zone: Zone | undefined;
  frais: number;
  creneauDebut: Date | null;
  creneauFin: Date | null;
  livreurId: string | null;
}

export function useCreerCourse() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async (c: NouvelleCourse) => {
      const code = nouveauCode();
      const { error } = await db.from("livraisons").insert({
        id: crypto.randomUUID(),
        pressing_id: c.pressingId,
        boutique_id: c.boutiqueId,
        depot_id: c.depotId,
        client_id: c.clientId,
        type: c.type,
        adresse: c.adresse.trim(),
        repere: c.repere.trim() || null,
        zone_id: c.zone?.id ?? null,
        frais: c.frais,
        creneau_debut: c.creneauDebut?.toISOString() ?? null,
        creneau_fin: c.creneauFin?.toISOString() ?? null,
        livreur_id: c.livreurId,
        statut: c.livreurId ? "planifie" : "demande",
        code_confirmation: code,
      });
      if (error) throw error;
      // Les frais de livraison s'ajoutent au dépôt (le net et le reste sont recalculés par la base).
      if (c.depotId && c.type === "livraison") {
        const { error: e2 } = await supabase
          .from("depots")
          .update({ frais_livraison: c.frais })
          .eq("id", c.depotId);
        if (e2) throw e2;
      }
      return code;
    },
    onSuccess: invalider,
  });
}

export function useAffecterLivreur() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async ({ id, livreurId }: { id: string; livreurId: string | null }) => {
      const { error } = await db
        .from("livraisons")
        .update({ livreur_id: livreurId, statut: livreurId ? "planifie" : "demande" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

export function useAvancerCourse() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      statut: "en_cours" | "echoue" | "annule";
      motif?: string;
    }) => {
      const { error } = await rpcLibre("avancer_livraison", {
        p_livraison: p.id,
        p_statut: p.statut,
        p_motif: p.motif ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

export function useTerminerCourse() {
  const invalider = useInvalider();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      code: string;
      montant: number;
      moyen: MoyenPaiement;
      reference: string;
    }) => {
      const { error } = await rpcLibre("terminer_livraison", {
        p_livraison: p.id,
        p_code: p.code.trim() || null,
        p_montant: p.montant,
        p_moyen: p.moyen,
        p_reference: p.reference.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}
