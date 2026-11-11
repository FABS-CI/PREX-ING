import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { bornes, type Periode } from "@/lib/periode";
import type { MoyenPaiement } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export const CATEGORIES_DEPENSE: { id: string; libelle: string }[] = [
  { id: "loyer", libelle: "Loyer" },
  { id: "electricite", libelle: "Électricité" },
  { id: "eau", libelle: "Eau" },
  { id: "carburant", libelle: "Carburant" },
  { id: "produits", libelle: "Produits" },
  { id: "reparation", libelle: "Réparations" },
  { id: "transport", libelle: "Transport" },
  { id: "autre", libelle: "Autre" },
];
export const libelleCategorie = (id: string) =>
  CATEGORIES_DEPENSE.find((c) => c.id === id)?.libelle ?? id;

/** Lit toutes les lignes d'une requête, par pages de 1 000 (limite du serveur). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function lireTout<T>(requete: (debut: number, fin: number) => any): Promise<T[]> {
  const r: T[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await requete(debut, debut + 999);
    if (error) throw error;
    r.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return r;
  }
}

/* ---------- Dépenses ---------- */

export interface Depense {
  id: string;
  categorie: string;
  libelle: string | null;
  montant: number;
  date: string;
  moyen: MoyenPaiement;
  justificatif_url: string | null;
  session_caisse_id: string | null;
  fournisseurs: { nom: string } | null;
  profiles: { nom: string } | null;
}

export function useDepenses(boutiqueId: string, p: Periode) {
  const b = bornes(p);
  return useQuery({
    queryKey: ["depenses", boutiqueId, b.debutDate, b.finDate],
    queryFn: async () => {
      const { data, error } = await db
        .from("depenses")
        .select(
          "id, categorie, libelle, montant, date, moyen, justificatif_url, session_caisse_id, fournisseurs(nom), profiles!depenses_par_fkey(nom)",
        )
        .eq("boutique_id", boutiqueId)
        .is("deleted_at", null)
        .gte("date", b.debutDate)
        .lt("date", b.finDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Depense[];
    },
  });
}

/** Réduit une photo (1 280 px max, JPEG) avant l'envoi : moins de données mobiles. */
export async function compresserImage(fichier: File): Promise<Blob> {
  if (!fichier.type.startsWith("image/")) return fichier;
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? fichier), "image/jpeg", 0.72));
}

export function useAjouterDepense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: {
      pressingId: string;
      boutiqueId: string;
      categorie: string;
      libelle: string;
      montant: number;
      date: string;
      moyen: MoyenPaiement;
      fournisseurId: string | null;
      photo: File | null;
    }) => {
      const id = crypto.randomUUID();
      let justificatif: string | null = null;
      let avertissement: string | null = null;
      if (d.photo) {
        const chemin = `${d.pressingId}/justificatifs/${id}.jpg`;
        const { error } = await supabase.storage
          .from("pressing-files")
          .upload(chemin, await compresserImage(d.photo), { contentType: "image/jpeg" });
        if (error)
          avertissement = `Justificatif non envoyé (${error.message}). La dépense est enregistrée sans photo.`;
        else justificatif = chemin;
      }
      const { error } = await db.from("depenses").insert({
        id,
        pressing_id: d.pressingId,
        boutique_id: d.boutiqueId,
        categorie: d.categorie,
        libelle: d.libelle.trim() || null,
        montant: d.montant,
        date: d.date,
        moyen: d.moyen,
        fournisseur_id: d.fournisseurId,
        justificatif_url: justificatif,
      });
      if (error) throw error;
      return { avertissement };
    },
    onSuccess: () => {
      for (const k of ["depenses", "caisse-resume", "rapport"])
        void qc.invalidateQueries({ queryKey: [k] });
    },
  });
}

export async function lienJustificatif(chemin: string): Promise<string | null> {
  const { data } = await supabase.storage.from("pressing-files").createSignedUrl(chemin, 300);
  return data?.signedUrl ?? null;
}

/* ---------- Fournisseurs ---------- */

export interface Fournisseur {
  id: string;
  nom: string;
  telephone: string | null;
  notes: string | null;
}

export function useFournisseurs(pressingId: string) {
  return useQuery({
    queryKey: ["fournisseurs", pressingId],
    queryFn: async () => {
      const { data, error } = await db
        .from("fournisseurs")
        .select("id, nom, telephone, notes")
        .eq("pressing_id", pressingId)
        .is("deleted_at", null)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Fournisseur[];
    },
  });
}

export function useAjouterFournisseur(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: { nom: string; telephone: string; notes: string }) => {
      const { error } = await db.from("fournisseurs").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        nom: f.nom.trim(),
        telephone: f.telephone.replace(/\D/g, "") || null,
        notes: f.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["fournisseurs", pressingId] }),
  });
}

/* ---------- Stock ---------- */

export interface Produit {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  seuil_alerte: number;
}
export interface MouvementStock {
  id: string;
  type: "entree" | "sortie";
  quantite: number;
  cout_unitaire: number | null;
  note: string | null;
  created_at: string;
  stock_produits: { nom: string; unite: string } | null;
  fournisseurs: { nom: string } | null;
}

export const aReapprovisionner = (p: Produit) => p.quantite <= p.seuil_alerte;

export function useProduits(boutiqueId: string) {
  return useQuery({
    queryKey: ["stock", boutiqueId],
    queryFn: async () => {
      const { data, error } = await db
        .from("stock_produits")
        .select("id, nom, unite, quantite, seuil_alerte")
        .eq("boutique_id", boutiqueId)
        .is("deleted_at", null)
        .order("nom");
      if (error) throw error;
      return ((data ?? []) as Produit[]).map((p) => ({
        ...p,
        quantite: Number(p.quantite),
        seuil_alerte: Number(p.seuil_alerte),
      }));
    },
  });
}

export function useMouvementsStock(boutiqueId: string) {
  return useQuery({
    queryKey: ["stock-mouvements", boutiqueId],
    queryFn: async () => {
      const { data, error } = await db
        .from("mouvements_stock")
        .select(
          "id, type, quantite, cout_unitaire, note, created_at, stock_produits(nom, unite), fournisseurs(nom)",
        )
        .eq("boutique_id", boutiqueId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as MouvementStock[]).map((m) => ({
        ...m,
        quantite: Number(m.quantite),
      }));
    },
  });
}

function useInvaliderStock() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["stock"] });
    void qc.invalidateQueries({ queryKey: ["stock-mouvements"] });
  };
}

export function useAjouterProduit() {
  const invalider = useInvaliderStock();
  return useMutation({
    mutationFn: async (p: {
      pressingId: string;
      boutiqueId: string;
      nom: string;
      unite: string;
      seuil: number;
    }) => {
      const { error } = await db.from("stock_produits").insert({
        id: crypto.randomUUID(),
        pressing_id: p.pressingId,
        boutique_id: p.boutiqueId,
        nom: p.nom.trim(),
        unite: p.unite.trim() || "unité",
        seuil_alerte: p.seuil,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

/** Différence d'inventaire → mouvement d'entrée ou de sortie (null si rien à corriger). */
export function ecartInventaire(
  actuelle: number,
  comptee: number,
): { type: "entree" | "sortie"; quantite: number } | null {
  const ecart = Math.round((comptee - actuelle) * 100) / 100;
  if (ecart === 0) return null;
  return { type: ecart > 0 ? "entree" : "sortie", quantite: Math.abs(ecart) };
}

export function useMouvementStock() {
  const invalider = useInvaliderStock();
  return useMutation({
    mutationFn: async (m: {
      pressingId: string;
      boutiqueId: string;
      produitId: string;
      type: "entree" | "sortie";
      quantite: number;
      coutUnitaire: number | null;
      fournisseurId: string | null;
      note: string;
    }) => {
      const { error } = await db.from("mouvements_stock").insert({
        id: crypto.randomUUID(),
        pressing_id: m.pressingId,
        boutique_id: m.boutiqueId,
        produit_id: m.produitId,
        type: m.type,
        quantite: m.quantite,
        cout_unitaire: m.coutUnitaire,
        fournisseur_id: m.fournisseurId,
        note: m.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });
}

/* ---------- Rapports ---------- */

export interface LigneRapport {
  cle: string;
  libelle: string;
  montant: number;
  nombre: number;
}
export interface Rapport {
  chiffreAffaires: number;
  nbDepots: number;
  pieces: number;
  encaissements: number;
  aVerifier: number;
  depenses: number;
  benefice: number;
  parMoyen: LigneRapport[];
  parService: LigneRapport[];
  parEmploye: LigneRapport[];
  parCategorieDepense: LigneRapport[];
  topClients: LigneRapport[];
  topArticles: LigneRapport[];
  parJour: { jour: string; encaissements: number; depenses: number }[];
}

function regrouper<T>(
  rows: T[],
  cle: (r: T) => string,
  libelle: (r: T) => string,
  montant: (r: T) => number,
  nombre: (r: T) => number = () => 1,
): LigneRapport[] {
  const m = new Map<string, LigneRapport>();
  for (const r of rows) {
    const k = cle(r);
    const l = m.get(k) ?? { cle: k, libelle: libelle(r), montant: 0, nombre: 0 };
    l.montant += montant(r);
    l.nombre += nombre(r);
    m.set(k, l);
  }
  return [...m.values()].sort((a, b) => b.montant - a.montant);
}

interface DepotR {
  id: string;
  net_a_payer: number;
  client_id: string;
  clients: { nom: string } | null;
}
interface LigneR {
  total: number;
  quantite: number;
  libelle: string;
  article_id: string | null;
  services: { nom: string } | null;
  depots: { statut: string; created_at: string; boutique_id: string } | null;
}
interface PaiementR {
  montant: number;
  moyen: MoyenPaiement;
  statut: string;
  created_at: string;
  encaisse_par: string | null;
  profiles: { nom: string } | null;
}
interface DepenseR {
  montant: number;
  categorie: string;
  date: string;
}

/** Calcul pur du rapport (exporté pour les tests). */
export function calculerRapport(
  depots: DepotR[],
  lignes: LigneR[],
  paiements: PaiementR[],
  depenses: DepenseR[],
  jours: string[],
  libelleMoyen: (m: MoyenPaiement) => string,
): Rapport {
  const valides = paiements.filter((p) => p.statut === "valide");
  const encaissements = valides.reduce((a, p) => a + p.montant, 0);
  const totalDepenses = depenses.reduce((a, d) => a + d.montant, 0);
  const jourDe = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return {
    chiffreAffaires: depots.reduce((a, d) => a + d.net_a_payer, 0),
    nbDepots: depots.length,
    pieces: lignes.reduce((a, l) => a + l.quantite, 0),
    encaissements,
    aVerifier: paiements
      .filter((p) => p.statut === "a_verifier")
      .reduce((a, p) => a + p.montant, 0),
    depenses: totalDepenses,
    benefice: encaissements - totalDepenses,
    parMoyen: regrouper(
      valides,
      (p) => p.moyen,
      (p) => libelleMoyen(p.moyen),
      (p) => p.montant,
    ),
    parService: regrouper(
      lignes,
      (l) => l.services?.nom ?? "Autre",
      (l) => l.services?.nom ?? "Autre",
      (l) => l.total,
      (l) => l.quantite,
    ),
    parEmploye: regrouper(
      valides,
      (p) => p.encaisse_par ?? "?",
      (p) => p.profiles?.nom ?? "Inconnu",
      (p) => p.montant,
    ),
    parCategorieDepense: regrouper(
      depenses,
      (d) => d.categorie,
      (d) => libelleCategorie(d.categorie),
      (d) => d.montant,
    ),
    topClients: regrouper(
      depots,
      (d) => d.client_id,
      (d) => d.clients?.nom ?? "—",
      (d) => d.net_a_payer,
    ).slice(0, 10),
    topArticles: regrouper(
      lignes,
      (l) => l.libelle.split(" — ")[0] ?? l.libelle,
      (l) => l.libelle.split(" — ")[0] ?? l.libelle,
      (l) => l.total,
      (l) => l.quantite,
    )
      .sort((a, b) => b.nombre - a.nombre)
      .slice(0, 10),
    parJour: jours.map((j) => ({
      jour: j,
      encaissements: valides
        .filter((p) => jourDe(p.created_at) === j)
        .reduce((a, p) => a + p.montant, 0),
      depenses: depenses.filter((d) => d.date === j).reduce((a, d) => a + d.montant, 0),
    })),
  };
}

export function useRapport(
  boutiqueIds: string[],
  p: Periode,
  jours: string[],
  libelleMoyen: (m: MoyenPaiement) => string,
) {
  const b = bornes(p);
  return useQuery({
    queryKey: ["rapport", boutiqueIds.join(","), b.debutTs, b.finTs],
    enabled: boutiqueIds.length > 0,
    queryFn: async (): Promise<Rapport> => {
      const [depots, lignes, paiements, depenses] = await Promise.all([
        lireTout<DepotR>((d, f) =>
          db
            .from("depots")
            .select("id, net_a_payer, client_id, clients(nom)")
            .in("boutique_id", boutiqueIds)
            .is("deleted_at", null)
            .neq("statut", "annule")
            .gte("created_at", b.debutTs)
            .lt("created_at", b.finTs)
            .order("id")
            .range(d, f),
        ),
        lireTout<LigneR>((d, f) =>
          db
            .from("depot_lignes")
            .select(
              "total, quantite, libelle, article_id, services(nom), depots!inner(statut, created_at, boutique_id)",
            )
            .in("depots.boutique_id", boutiqueIds)
            .neq("depots.statut", "annule")
            .gte("depots.created_at", b.debutTs)
            .lt("depots.created_at", b.finTs)
            .is("deleted_at", null)
            .order("id")
            .range(d, f),
        ),
        lireTout<PaiementR>((d, f) =>
          db
            .from("paiements")
            .select(
              "montant, moyen, statut, created_at, encaisse_par, profiles!paiements_encaisse_par_fkey(nom)",
            )
            .in("boutique_id", boutiqueIds)
            .in("statut", ["valide", "a_verifier"])
            .gte("created_at", b.debutTs)
            .lt("created_at", b.finTs)
            .order("id")
            .range(d, f),
        ),
        lireTout<DepenseR>((d, f) =>
          db
            .from("depenses")
            .select("montant, categorie, date")
            .in("boutique_id", boutiqueIds)
            .is("deleted_at", null)
            .gte("date", b.debutDate)
            .lt("date", b.finDate)
            .order("id")
            .range(d, f),
        ),
      ]);
      return calculerRapport(depots, lignes, paiements, depenses, jours, libelleMoyen);
    },
  });
}
