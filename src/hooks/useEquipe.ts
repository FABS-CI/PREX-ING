import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { rpcLibre } from "@/hooks/useModesAvances";
import { lireTout } from "@/hooks/useGestion";
import { bornesMois, type Activite, type TypeRemuneration } from "@/lib/salaire";
import type { MoyenPaiement, Role } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export interface Membre {
  id: string;
  user_id: string;
  role: Role;
  plafond_remise_pct: number;
  boutique_ids: string[] | null;
  actif: boolean;
  profiles: { nom: string; telephone: string | null } | null;
}
export interface Employe {
  id: string;
  boutique_id: string | null;
  user_id: string | null;
  nom: string;
  telephone: string | null;
  poste: string | null;
  date_embauche: string | null;
  type_remuneration: TypeRemuneration;
  montant_base: number;
  actif: boolean;
}
export interface Pointage {
  id: string;
  employe_id: string;
  arrivee: string;
  depart: string | null;
  type: "presence" | "absence" | "conge";
  note: string | null;
}
export interface Avance {
  id: string;
  employe_id: string;
  montant: number;
  date: string;
  note: string | null;
  deduite_salaire_id: string | null;
}
export interface Salaire {
  id: string;
  employe_id: string;
  mois: string;
  base: number;
  primes: number;
  retenues: number;
  avances: number;
  net: number;
  paye_le: string | null;
  moyen: MoyenPaiement | null;
}

const inval = (qc: ReturnType<typeof useQueryClient>, ...cles: string[]) => {
  for (const k of cles) void qc.invalidateQueries({ queryKey: [k] });
};

export function useMembres(pressingId: string) {
  return useQuery({
    queryKey: ["membres", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("memberships")
        .select(
          "id, user_id, role, plafond_remise_pct, boutique_ids, actif, profiles(nom, telephone)",
        )
        .eq("pressing_id", pressingId)
        .order("created_at");
      if (error) throw error;
      return ((data ?? []) as Membre[]).map((m) => ({
        ...m,
        plafond_remise_pct: Number(m.plafond_remise_pct),
      }));
    },
  });
}

export function useAjouterMembre(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      email: string;
      role: Role;
      plafond: number;
      boutiqueIds: string[] | null;
    }) => {
      const { error } = await rpcLibre("ajouter_membre", {
        p_pressing: pressingId,
        p_email: p.email.trim(),
        p_role: p.role,
        p_plafond: p.plafond,
        p_boutique_ids: p.boutiqueIds,
      });
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "membres", "employes"),
  });
}

export function useModifierMembre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      role: Role;
      plafond: number;
      actif: boolean;
      boutiqueIds: string[] | null;
    }) => {
      const { error } = await db
        .from("memberships")
        .update({
          role: p.role,
          plafond_remise_pct: p.plafond,
          actif: p.actif,
          boutique_ids: p.boutiqueIds,
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "membres"),
  });
}

export function useEmployes(pressingId: string) {
  return useQuery({
    queryKey: ["employes", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("employes")
        .select(
          "id, boutique_id, user_id, nom, telephone, poste, date_embauche, type_remuneration, montant_base, actif",
        )
        .eq("pressing_id", pressingId)
        .is("deleted_at", null)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Employe[];
    },
  });
}

export function useEnregistrerEmploye(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Omit<Employe, "id" | "user_id"> & { id?: string | undefined }) => {
      const { id, ...champs } = e;
      const { error } = id
        ? await db.from("employes").update(champs).eq("id", id)
        : await db
            .from("employes")
            .insert({ id: crypto.randomUUID(), pressing_id: pressingId, ...champs });
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "employes"),
  });
}

export function usePointagesMois(pressingId: string, mois: string) {
  const b = bornesMois(mois);
  return useQuery({
    queryKey: ["pointages", pressingId, mois],
    queryFn: async () =>
      lireTout<Pointage>((d, f) =>
        db
          .from("pointages")
          .select("id, employe_id, arrivee, depart, type, note")
          .eq("pressing_id", pressingId)
          .gte("arrivee", new Date(`${b.debut}T00:00:00`).toISOString())
          .lt("arrivee", new Date(`${b.fin}T00:00:00`).toISOString())
          .order("arrivee", { ascending: false })
          .range(d, f),
      ),
  });
}

/** Pointage fait par le propriétaire ou le gérant pour un employé. */
export function usePointerPour(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      employeId: string;
      action: "arrivee" | "depart" | "absence" | "conge";
      pointageId?: string | undefined;
      date?: string;
      note?: string;
    }) => {
      if (p.action === "depart" && p.pointageId) {
        const { error } = await db
          .from("pointages")
          .update({ depart: new Date().toISOString() })
          .eq("id", p.pointageId);
        if (error) throw error;
        return;
      }
      const arrivee =
        p.action === "arrivee"
          ? new Date()
          : new Date(`${p.date ?? new Date().toISOString().slice(0, 10)}T08:00:00`);
      const { error } = await db.from("pointages").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        employe_id: p.employeId,
        arrivee: arrivee.toISOString(),
        type: p.action === "arrivee" ? "presence" : p.action,
        note: p.note?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "pointages"),
  });
}

export function useAvances(pressingId: string) {
  return useQuery({
    queryKey: ["avances", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("avances")
        .select("id, employe_id, montant, date, note, deduite_salaire_id")
        .eq("pressing_id", pressingId)
        .order("date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Avance[];
    },
  });
}

export function useAjouterAvance(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { employeId: string; montant: number; date: string; note: string }) => {
      const { error } = await db.from("avances").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        employe_id: a.employeId,
        montant: a.montant,
        date: a.date,
        note: a.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "avances"),
  });
}

export function useSalairesMois(pressingId: string, mois: string) {
  return useQuery({
    queryKey: ["salaires", pressingId, mois],
    queryFn: async () => {
      const { data, error } = await db
        .from("salaires")
        .select("id, employe_id, mois, base, primes, retenues, avances, net, paye_le, moyen")
        .eq("pressing_id", pressingId)
        .eq("mois", bornesMois(mois).debut);
      if (error) throw error;
      return (data ?? []) as Salaire[];
    },
  });
}

/** Activité du mois par employé : jours de présence et d'absence, pièces enregistrées, montant encaissé. */
export function useActiviteMois(pressingId: string, mois: string, employes: Employe[]) {
  const b = bornesMois(mois);
  return useQuery({
    queryKey: ["activite", pressingId, mois, employes.map((e) => e.id).join(",")],
    enabled: employes.length > 0,
    queryFn: async () => {
      const debutTs = new Date(`${b.debut}T00:00:00`).toISOString();
      const finTs = new Date(`${b.fin}T00:00:00`).toISOString();
      const [pointages, lignes, paiements] = await Promise.all([
        lireTout<Pointage>((d, f) =>
          db
            .from("pointages")
            .select("id, employe_id, arrivee, type")
            .eq("pressing_id", pressingId)
            .gte("arrivee", debutTs)
            .lt("arrivee", finTs)
            .order("id")
            .range(d, f),
        ),
        lireTout<{ quantite: number; depots: { cree_par: string | null } | null }>((d, f) =>
          db
            .from("depot_lignes")
            .select("quantite, depots!inner(cree_par, statut, created_at)")
            .eq("pressing_id", pressingId)
            .neq("depots.statut", "annule")
            .gte("depots.created_at", debutTs)
            .lt("depots.created_at", finTs)
            .is("deleted_at", null)
            .order("id")
            .range(d, f),
        ),
        lireTout<{ montant: number; encaisse_par: string | null }>((d, f) =>
          db
            .from("paiements")
            .select("montant, encaisse_par")
            .eq("pressing_id", pressingId)
            .eq("statut", "valide")
            .gte("created_at", debutTs)
            .lt("created_at", finTs)
            .order("id")
            .range(d, f),
        ),
      ]);
      const r = new Map<string, Activite>();
      for (const e of employes) {
        const jours = (t: string) =>
          new Set(
            pointages
              .filter((p) => p.employe_id === e.id && p.type === t)
              .map((p) => p.arrivee.slice(0, 10)),
          ).size;
        r.set(e.id, {
          joursPresence: jours("presence"),
          joursAbsence: jours("absence"),
          pieces: e.user_id
            ? lignes
                .filter((l) => l.depots?.cree_par === e.user_id)
                .reduce((a, l) => a + l.quantite, 0)
            : 0,
          encaisse: e.user_id
            ? paiements
                .filter((p) => p.encaisse_par === e.user_id)
                .reduce((a, p) => a + p.montant, 0)
            : 0,
        });
      }
      return r;
    },
  });
}

export function useEnregistrerSalaire(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: {
      id?: string | undefined;
      employeId: string;
      mois: string;
      base: number;
      primes: number;
      retenues: number;
      avances: number;
    }) => {
      const champs = { base: s.base, primes: s.primes, retenues: s.retenues, avances: s.avances };
      const { error } = s.id
        ? await db.from("salaires").update(champs).eq("id", s.id)
        : await db.from("salaires").insert({
            id: crypto.randomUUID(),
            pressing_id: pressingId,
            employe_id: s.employeId,
            mois: bornesMois(s.mois).debut,
            ...champs,
          });
      if (error) throw error;
    },
    onSuccess: () => inval(qc, "salaires"),
  });
}

export function usePayerSalaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { salaireId: string; moyen: MoyenPaiement }) => {
      const { data, error } = await rpcLibre("payer_salaire", {
        p_salaire: p.salaireId,
        p_moyen: p.moyen,
      });
      if (error) throw error;
      return data as Salaire;
    },
    onSuccess: () => inval(qc, "salaires", "avances", "caisse-resume", "rapport"),
  });
}

export interface EtatPointage {
  employe_id: string;
  nom: string;
  arrivee: string | null;
}

export function useEtatPointage(pressingId: string) {
  return useQuery({
    queryKey: ["etat-pointage", pressingId],
    queryFn: async () => {
      const { data, error } = await rpcLibre("etat_pointage", { p_pressing: pressingId });
      if (error) throw error;
      return (data ?? null) as EtatPointage | null;
    },
  });
}

export function usePointer(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await rpcLibre("pointer", { p_pressing: pressingId });
      if (error) throw error;
      return data as EtatPointage;
    },
    onSuccess: () => inval(qc, "etat-pointage", "pointages"),
  });
}
