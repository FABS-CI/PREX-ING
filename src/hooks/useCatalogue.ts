import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Article, Categorie, Service, Tarif } from "@/lib/types";

export interface Catalogue {
  categories: Categorie[];
  articles: Article[];
  services: Service[];
  /** Tous les tarifs non supprimés (communs et propres aux boutiques). */
  tarifs: Tarif[];
}

/** Clé de recherche rapide d'un tarif. */
const cle = (articleId: string, serviceId: string, boutiqueId: string | null) =>
  `${articleId}|${serviceId}|${boutiqueId ?? "*"}`;

export function useCatalogue(pressingId: string) {
  return useQuery({
    queryKey: ["catalogue", pressingId],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Catalogue> => {
      const [cats, arts, servs, tars] = await Promise.all([
        supabase
          .from("categories")
          .select("id, nom, ordre")
          .eq("pressing_id", pressingId)
          .is("deleted_at", null)
          .order("ordre"),
        supabase
          .from("articles")
          .select("id, categorie_id, nom, image_url, ordre, actif")
          .eq("pressing_id", pressingId)
          .is("deleted_at", null)
          .order("ordre")
          .order("nom"),
        supabase
          .from("services")
          .select("id, nom, delai_jours, majoration_express_pct, ordre, actif")
          .eq("pressing_id", pressingId)
          .is("deleted_at", null)
          .order("ordre"),
        supabase
          .from("tarifs")
          .select("id, article_id, service_id, boutique_id, prix")
          .eq("pressing_id", pressingId)
          .is("deleted_at", null),
      ]);
      for (const r of [cats, arts, servs, tars]) if (r.error) throw r.error;
      return {
        categories: (cats.data ?? []) as Categorie[],
        articles: (arts.data ?? []) as Article[],
        services: ((servs.data ?? []) as Service[]).map((s) => ({
          ...s,
          majoration_express_pct: Number(s.majoration_express_pct),
        })),
        tarifs: (tars.data ?? []) as Tarif[],
      };
    },
  });
}

/** Index des tarifs + prix applicable : tarif de la boutique, sinon tarif commun. */
export function indexTarifs(tarifs: Tarif[]) {
  const map = new Map<string, Tarif>();
  for (const t of tarifs) map.set(cle(t.article_id, t.service_id, t.boutique_id), t);
  return {
    commun: (articleId: string, serviceId: string) => map.get(cle(articleId, serviceId, null)),
    prix: (articleId: string, serviceId: string, boutiqueId: string): number | null => {
      const t =
        map.get(cle(articleId, serviceId, boutiqueId)) ?? map.get(cle(articleId, serviceId, null));
      return t ? t.prix : null;
    },
  };
}

/** Enregistre (ou retire) le prix commun d'un article pour un service. */
export function useEnregistrerPrix(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      articleId: string;
      serviceId: string;
      prix: number | null;
      tarifId?: string | undefined;
    }) => {
      if (p.prix === null) {
        if (!p.tarifId) return;
        const { error } = await supabase
          .from("tarifs")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", p.tarifId);
        if (error) throw error;
        return;
      }
      if (p.tarifId) {
        const { error } = await supabase
          .from("tarifs")
          .update({ prix: p.prix })
          .eq("id", p.tarifId);
        if (error) throw error;
        return;
      }
      // Un tarif retiré auparavant existe peut-être encore (suppression logique) : on le réactive.
      const { data: ancien, error: errLecture } = await supabase
        .from("tarifs")
        .select("id")
        .eq("pressing_id", pressingId)
        .eq("article_id", p.articleId)
        .eq("service_id", p.serviceId)
        .is("boutique_id", null)
        .maybeSingle();
      if (errLecture) throw errLecture;
      if (ancien) {
        const { error } = await supabase
          .from("tarifs")
          .update({ prix: p.prix, deleted_at: null })
          .eq("id", (ancien as { id: string }).id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("tarifs").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        article_id: p.articleId,
        service_id: p.serviceId,
        boutique_id: null,
        prix: p.prix,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalogue", pressingId] }),
  });
}

export function useAjouterArticle(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { nom: string; categorieId: string | null; ordre: number }) => {
      const { error } = await supabase.from("articles").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        categorie_id: p.categorieId,
        nom: p.nom,
        ordre: p.ordre,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalogue", pressingId] }),
  });
}

export function useAjouterService(pressingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      nom: string;
      delaiJours: number;
      majorationExpressPct: number;
      ordre: number;
    }) => {
      const { error } = await supabase.from("services").insert({
        id: crypto.randomUUID(),
        pressing_id: pressingId,
        nom: p.nom,
        delai_jours: p.delaiJours,
        majoration_express_pct: p.majorationExpressPct,
        ordre: p.ordre,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["catalogue", pressingId] }),
  });
}
