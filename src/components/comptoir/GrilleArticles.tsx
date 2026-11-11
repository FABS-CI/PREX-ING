import { useMemo, useState } from "react";

import { indexTarifs, type Catalogue } from "@/hooks/useCatalogue";
import { formatFCFA } from "@/lib/format";
import type { Article, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  catalogue: Catalogue;
  boutiqueId: string;
  serviceId: string;
  onService: (id: string) => void;
  quantites: Map<string, number>;
  onAjouter: (article: Article, service: Service, prix: number) => void;
}

/** Couleur stable par catégorie pour repérer les familles d'articles d'un coup d'œil. */
const TEINTES = [
  "bg-primary/10 text-primary",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
];

export function GrilleArticles({
  catalogue,
  boutiqueId,
  serviceId,
  onService,
  quantites,
  onAjouter,
}: Props) {
  const [categorie, setCategorie] = useState<string>("toutes");
  const idx = useMemo(() => indexTarifs(catalogue.tarifs), [catalogue.tarifs]);
  const services = catalogue.services.filter((s) => s.actif);
  const service = services.find((s) => s.id === serviceId) ?? services[0];

  const articles = useMemo(() => {
    if (!service) return [];
    return catalogue.articles
      .filter((a) => a.actif && (categorie === "toutes" || a.categorie_id === categorie))
      .map((a) => ({ article: a, prix: idx.prix(a.id, service.id, boutiqueId) }))
      .filter((x): x is { article: Article; prix: number } => x.prix !== null);
  }, [catalogue.articles, categorie, idx, service, boutiqueId]);

  if (!service) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun service dans le catalogue.
      </p>
    );
  }

  const teinte = (catId: string | null) => {
    const i = catalogue.categories.findIndex((c) => c.id === catId);
    return TEINTES[(i < 0 ? 0 : i) % TEINTES.length];
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Service">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === service.id}
            onClick={() => onService(s.id)}
            className={cn(
              "h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold transition-colors",
              s.id === service.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-foreground hover:border-primary/40",
            )}
          >
            {s.nom}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "toutes", nom: "Tout" }, ...catalogue.categories].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategorie(c.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors",
              c.id === categorie
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun article n’a de prix pour « {service.nom} » dans cette catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {articles.map(({ article, prix }) => {
            const q = quantites.get(`${article.id}|${service.id}`) ?? 0;
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => onAjouter(article, service, prix)}
                className={cn(
                  "relative flex min-h-[92px] flex-col items-start justify-between rounded-xl border bg-card p-3 text-left transition active:scale-[0.98]",
                  q > 0 ? "border-primary ring-1 ring-primary" : "hover:border-primary/40",
                )}
              >
                {article.image_url ? (
                  <img
                    src={article.image_url}
                    alt=""
                    className="mb-1 h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "mb-1 flex size-8 items-center justify-center rounded-md text-xs font-bold",
                      teinte(article.categorie_id),
                    )}
                  >
                    {article.nom.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="line-clamp-2 text-sm leading-tight font-medium">
                  {article.nom}
                </span>
                <span className="montant mt-1 text-sm font-semibold text-primary dark:text-info">
                  {formatFCFA(prix)}
                </span>
                {q > 0 ? (
                  <span className="montant absolute top-2 right-2 flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                    {q}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
