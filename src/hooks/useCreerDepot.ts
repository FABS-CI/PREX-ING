import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { rpcLibre } from "@/hooks/useModesAvances";
import { estDoublon } from "@/lib/erreurs";
import {
  libelleLigne,
  piecesArticle,
  poidsFacture,
  prixUnitaire,
  repartirAbonnement,
  type LignePanier,
} from "@/lib/comptoir";
import { toISODate } from "@/lib/format";
import { enregistrerCompteur, etiquettesParLigne, prochainNumero } from "@/lib/numerotation";
import type { Depot, DepotLigne, ModeFacturation, MoyenPaiement, Paiement } from "@/lib/types";

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
  mode?: ModeFacturation;
  /** Mode abonnement : l'abonnement du client dont le quota est consommé. */
  abonnementId?: string | null;
  forfaitId?: string | null;
}

export interface DepotCree {
  depot: Depot;
  lignes: DepotLigne[];
  paiement: Paiement | null;
  /** Toutes les étiquettes, dans l'ordre, avec le libellé de la ligne. */
  etiquettes: { code: string; libelle: string }[];
  /** Pièces incluses dans l'abonnement (0 si pas d'abonnement). */
  couvertAbonnement?: number;
}

const TENTATIVES = 8;

export function libelleEnregistre(l: LignePanier): string {
  if (l.type === "kilo") return `Linge au kilo — ${l.serviceNom}`;
  if (l.type === "lot") return `Forfait ${l.articleNom}`;
  return `${libelleLigne(l)}${l.couvert ? " (abonnement)" : ""}`;
}

/** Enregistre un dépôt complet : dépôt, lignes avec étiquettes, avance éventuelle. */
export async function creerDepot(d: NouveauDepot): Promise<DepotCree> {
  const depotId = crypto.randomUUID();
  let couvert = 0;
  let lignesFinales = d.lignes;

  // 0. Abonnement : consommation verrouillée du quota, puis répartition des pièces incluses.
  if (d.abonnementId) {
    const pieces = piecesArticle(d.lignes);
    if (pieces > 0) {
      const { data, error } = await rpcLibre("consommer_abonnement", {
        p_abonnement: d.abonnementId,
        p_pieces: pieces,
      });
      if (error) throw error;
      couvert = Number(data ?? 0);
      lignesFinales = repartirAbonnement(d.lignes, couvert);
    }
  }
  const restituer = async () => {
    if (couvert > 0 && d.abonnementId)
      await rpcLibre("consommer_abonnement", { p_abonnement: d.abonnementId, p_pieces: -couvert });
  };

  try {
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
        mode: d.mode ?? "article",
        remise: d.remise,
        express: d.express,
        date_retrait_prevue: toISODate(d.dateRetrait),
        emplacement: d.emplacement.trim() || null,
        observations: d.observations.trim() || null,
        abonnement_client_id: d.abonnementId ?? null,
        forfait_id: d.forfaitId ?? null,
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
      lignesFinales.map((l) => l.quantite),
    );
    const lignes = lignesFinales.map((l, i) => ({
      id: crypto.randomUUID(),
      pressing_id: d.pressingId,
      boutique_id: d.boutiqueId,
      depot_id: depotId,
      article_id: l.type === "article" || !l.type ? l.articleId || null : null,
      service_id: l.serviceId || null,
      libelle: libelleEnregistre(l),
      quantite: l.quantite,
      poids_kg: l.type === "kilo" ? poidsFacture(l) : null,
      prix_unitaire: prixUnitaire(l, d.express),
      prix_lot: l.type === "lot" ? (l.prixLot ?? 0) : null,
      forfait_id: l.type === "lot" ? (l.forfaitId ?? null) : null,
      couvert_abonnement: Boolean(l.couvert),
      observations: l.observations.trim() || null,
      etiquette: etiquettes[i]?.resume ?? null,
    }));
    const resLignes = await supabase.from("depot_lignes").insert(lignes as never);
    if (resLignes.error) {
      await supabase
        .from("depots")
        .update({
          deleted_at: new Date().toISOString(),
          statut: "annule",
          annule_motif: "Échec d’enregistrement des lignes",
        })
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
      if (error) {
        couvert = 0; // le dépôt existe : le quota consommé reste acquis
        throw Object.assign(error, { depotCree: numero });
      }
      paiement = data as Paiement;
    }

    // 4. Relecture : les montants officiels viennent de la base.
    const [relu, relues] = await Promise.all([
      supabase.from("depots").select("*").eq("id", depotId).single(),
      supabase.from("depot_lignes").select("*").eq("depot_id", depotId),
    ]);
    if (relu.error) throw relu.error;
    const ordre = new Map<string, number>(lignes.map((l, i) => [l.id, i]));
    const lignesRelues = ((relues.data ?? []) as unknown as DepotLigne[]).sort(
      (a, b) => (ordre.get(a.id) ?? 0) - (ordre.get(b.id) ?? 0),
    );

    return {
      depot: relu.data as Depot,
      lignes: lignesRelues,
      paiement,
      couvertAbonnement: couvert,
      etiquettes: lignesFinales.flatMap((l, i) =>
        (etiquettes[i]?.pieces ?? []).map((code) => ({ code, libelle: libelleEnregistre(l) })),
      ),
    };
  } catch (e) {
    if (!(e as { depotCree?: string }).depotCree) await restituer();
    throw e;
  }
}

export function useCreerDepot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: creerDepot,
    onSuccess: () => {
      for (const k of [
        "tableau-de-bord",
        "clients",
        "client",
        "client-depots",
        "depots",
        "abonnement-actif",
        "client-abonnements",
        "caisse-resume",
      ])
        void qc.invalidateQueries({ queryKey: [k] });
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
