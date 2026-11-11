import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ajouterJours, toISODate } from "@/lib/format";
import type { MoyenPaiement } from "@/lib/types";

/* Tables ajoutées ou étendues par la migration 4 : accès non typé là où les types générés manquent. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Libre = { from: (t: string) => any };
const db = supabase as unknown as Libre;
type RpcLibre = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;
export const rpcLibre = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc.bind(supabase) as unknown as RpcLibre)(fn, args);

export interface PrixKilo {
  id: string;
  service_id: string;
  boutique_id: string | null;
  prix_kg: number;
  poids_min: number;
}
export interface ContenuForfait {
  article_id: string;
  service_id: string;
  quantite: number;
}
export interface Forfait {
  id: string;
  nom: string;
  description: string | null;
  contenu: ContenuForfait[];
  prix: number;
  validite_jours: number | null;
  actif: boolean;
}
export interface Formule {
  id: string;
  nom: string;
  quota_pieces: number | null;
  quota_kg: number | null;
  prix: number;
  duree_jours: number;
  actif: boolean;
}
export interface AbonnementActif {
  id: string;
  formule_id: string | null;
  quota_pieces: number | null;
  consomme_pieces: number;
  fin: string;
  statut: string;
  formules_abonnement_client: { nom: string } | null;
}

const num = (v: unknown) => Number(v ?? 0);

export function usePrixKilo(pressingId: string) {
  return useQuery({
    queryKey: ["prix-kilo", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("prix_kilo")
        .select("id, service_id, boutique_id, prix_kg, poids_min")
        .eq("pressing_id", pressingId)
        .is("deleted_at", null);
      if (error) throw error;
      return ((data ?? []) as unknown as PrixKilo[]).map((p) => ({
        ...p,
        poids_min: num(p.poids_min),
      }));
    },
  });
}

/** Prix au kilo applicable : celui de la boutique, sinon le prix commun. */
export function prixKiloPour(
  liste: PrixKilo[],
  serviceId: string,
  boutiqueId: string,
): PrixKilo | undefined {
  return (
    liste.find((p) => p.service_id === serviceId && p.boutique_id === boutiqueId) ??
    liste.find((p) => p.service_id === serviceId && p.boutique_id === null)
  );
}

export function useEnregistrerPrixKilo(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id?: string | undefined;
      serviceId: string;
      prixKg: number | null;
      poidsMin: number;
    }) => {
      if (p.id) {
        const maj =
          p.prixKg === null
            ? { deleted_at: new Date().toISOString() }
            : { prix_kg: p.prixKg, poids_min: p.poidsMin, deleted_at: null };
        const { error } = await db
          .from("prix_kilo")
          .update(maj as never)
          .eq("id", p.id);
        if (error) throw error;
        return;
      }
      if (p.prixKg === null) return;
      const { data: ancien } = await db
        .from("prix_kilo")
        .select("id")
        .eq("pressing_id", pressingId)
        .eq("service_id", p.serviceId)
        .is("boutique_id", null)
        .maybeSingle();
      const existant = ancien as { id: string } | null;
      const { error } = existant
        ? await db
            .from("prix_kilo")
            .update({ prix_kg: p.prixKg, poids_min: p.poidsMin, deleted_at: null } as never)
            .eq("id", existant.id)
        : await db.from("prix_kilo").insert({
            id: crypto.randomUUID(),
            pressing_id: pressingId,
            service_id: p.serviceId,
            boutique_id: null,
            prix_kg: p.prixKg,
            poids_min: p.poidsMin,
          } as never);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["prix-kilo", pressingId] }),
  });
}

export function useForfaits(pressingId: string) {
  return useQuery({
    queryKey: ["forfaits", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("forfaits")
        .select("id, nom, description, contenu, prix, validite_jours, actif")
        .eq("pressing_id", pressingId)
        .is("deleted_at", null)
        .order("prix");
      if (error) throw error;
      return (data ?? []) as unknown as Forfait[];
    },
  });
}

export function useEnregistrerForfait(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: {
      id?: string;
      nom: string;
      prix: number;
      contenu: ContenuForfait[];
      actif?: boolean;
    }) => {
      const ligne = { nom: f.nom, prix: f.prix, contenu: f.contenu, actif: f.actif ?? true };
      const { error } = f.id
        ? await db
            .from("forfaits")
            .update(ligne as never)
            .eq("id", f.id)
        : await db
            .from("forfaits")
            .insert({ id: crypto.randomUUID(), pressing_id: pressingId, ...ligne } as never);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["forfaits", pressingId] }),
  });
}

export function useFormules(pressingId: string) {
  return useQuery({
    queryKey: ["formules", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("formules_abonnement_client")
        .select("id, nom, quota_pieces, quota_kg, prix, duree_jours, actif")
        .eq("pressing_id", pressingId)
        .is("deleted_at", null)
        .order("prix");
      if (error) throw error;
      return (data ?? []) as unknown as Formule[];
    },
  });
}

export function useEnregistrerFormule(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: {
      id?: string;
      nom: string;
      quotaPieces: number;
      prix: number;
      dureeJours: number;
      actif?: boolean;
    }) => {
      const ligne = {
        nom: f.nom,
        quota_pieces: f.quotaPieces,
        prix: f.prix,
        duree_jours: f.dureeJours,
        actif: f.actif ?? true,
      };
      const { error } = f.id
        ? await db
            .from("formules_abonnement_client")
            .update(ligne as never)
            .eq("id", f.id)
        : await db
            .from("formules_abonnement_client")
            .insert({ id: crypto.randomUUID(), pressing_id: pressingId, ...ligne } as never);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["formules", pressingId] }),
  });
}

/** Abonnement en cours du client (quota en pièces, non expiré). */
export function useAbonnementActif(clientId: string | undefined) {
  return useQuery({
    queryKey: ["abonnement-actif", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await db
        .from("abonnements_clients")
        .select(
          "id, formule_id, quota_pieces, consomme_pieces, fin, statut, formules_abonnement_client(nom)",
        )
        .eq("client_id", clientId ?? "")
        .eq("statut", "actif")
        .gte("fin", toISODate(new Date()))
        .is("deleted_at", null)
        .not("quota_pieces", "is", null)
        .order("fin", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as AbonnementActif | null;
    },
  });
}

/** Vente d'un abonnement : crée l'abonnement et enregistre son paiement. */
export function useSouscrire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      pressingId: string;
      boutiqueId: string;
      clientId: string;
      formule: Formule;
      moyen: MoyenPaiement;
      reference: string;
    }) => {
      const id = crypto.randomUUID();
      const { error } = await db.from("abonnements_clients").insert({
        id,
        pressing_id: p.pressingId,
        client_id: p.clientId,
        formule_id: p.formule.id,
        quota_pieces: p.formule.quota_pieces,
        quota_kg: p.formule.quota_kg,
        debut: toISODate(new Date()),
        fin: toISODate(ajouterJours(new Date(), p.formule.duree_jours)),
      } as never);
      if (error) throw error;
      if (p.formule.prix > 0) {
        const { error: e2 } = await supabase.from("paiements").insert({
          id: crypto.randomUUID(),
          pressing_id: p.pressingId,
          boutique_id: p.boutiqueId,
          client_id: p.clientId,
          montant: p.formule.prix,
          moyen: p.moyen,
          statut: p.moyen === "especes" ? "valide" : "a_verifier",
          reference_operateur: p.reference.trim() || null,
        });
        if (e2) throw e2;
      }
      return id;
    },
    onSuccess: () => {
      for (const k of [
        "abonnement-actif",
        "client-abonnements",
        "client-paiements",
        "caisse-resume",
        "caisse-a-verifier",
      ])
        void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}
