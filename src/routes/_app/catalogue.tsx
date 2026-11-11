import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditeurForfaits,
  EditeurFormules,
  EditeurPrixKilo,
} from "@/components/catalogue/ModesAvances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import {
  indexTarifs,
  useAjouterArticle,
  useAjouterService,
  useCatalogue,
  useEnregistrerPrix,
  type Catalogue,
} from "@/hooks/useCatalogue";
import { messageErreur } from "@/lib/erreurs";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/catalogue")({
  head: () => ({ meta: [{ title: "Catalogue & tarifs — PREX’ING" }] }),
  component: CataloguePage,
});

function CellulePrix({
  pressingId,
  articleId,
  serviceId,
  tarifId,
  prix,
}: {
  pressingId: string;
  articleId: string;
  serviceId: string;
  tarifId: string | undefined;
  prix: number | null;
}) {
  const enregistrer = useEnregistrerPrix(pressingId);
  const [valeur, setValeur] = useState(prix === null ? "" : String(prix));
  const [focus, setFocus] = useState(false);

  async function valider() {
    setFocus(false);
    const brut = valeur.replace(/\D/g, "");
    const nouveau = brut === "" ? null : Number(brut);
    if (nouveau === prix) return;
    try {
      await enregistrer.mutateAsync({ articleId, serviceId, prix: nouveau, tarifId });
      toast.success(nouveau === null ? "Prix retiré" : `Prix enregistré : ${formatFCFA(nouveau)}`);
    } catch (e) {
      toast.error(messageErreur(e));
      setValeur(prix === null ? "" : String(prix));
    }
  }

  return (
    <input
      inputMode="numeric"
      aria-label="Prix en FCFA"
      value={focus ? valeur : valeur === "" ? "" : formatFCFA(Number(valeur), false)}
      placeholder="—"
      onFocus={(e) => {
        setFocus(true);
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => setValeur(e.target.value.replace(/\D/g, ""))}
      onBlur={() => void valider()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setValeur(prix === null ? "" : String(prix));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "montant h-9 w-full min-w-[84px] rounded-md border border-transparent bg-transparent px-2 text-right text-sm outline-none",
        "hover:border-input focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30",
        enregistrer.isPending && "opacity-50",
        valeur === "" && "text-muted-foreground",
      )}
    />
  );
}

function DialogueArticle({
  ouvert,
  onFermer,
  catalogue,
  pressingId,
}: {
  ouvert: boolean;
  onFermer: () => void;
  catalogue: Catalogue;
  pressingId: string;
}) {
  const ajouter = useAjouterArticle(pressingId);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<string>(catalogue.categories[0]?.id ?? "");

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    try {
      await ajouter.mutateAsync({
        nom: nom.trim(),
        categorieId: categorie || null,
        ordre: catalogue.articles.length + 1,
      });
      toast.success(`Article « ${nom.trim()} » ajouté. Saisissez ses prix dans le tableau.`);
      setNom("");
      onFermer();
    } catch (err) {
      toast.error(messageErreur(err));
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <form onSubmit={soumettre}>
          <DialogHeader>
            <DialogTitle>Ajouter un article</DialogTitle>
            <DialogDescription>
              Par exemple « Grand boubou brodé » ou « Couette 2 places ».
            </DialogDescription>
          </DialogHeader>
          <div className="my-5 space-y-4">
            <Champ id="article-nom" libelle="Nom de l’article">
              <Input
                id="article-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                className="h-11"
              />
            </Champ>
            <Champ id="article-cat" libelle="Catégorie">
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger id="article-cat" className="h-11">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {catalogue.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nom.trim() || ajouter.isPending}>
              {ajouter.isPending ? <Loader2 className="animate-spin" /> : null}
              Ajouter l’article
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogueService({
  ouvert,
  onFermer,
  catalogue,
  pressingId,
}: {
  ouvert: boolean;
  onFermer: () => void;
  catalogue: Catalogue;
  pressingId: string;
}) {
  const ajouter = useAjouterService(pressingId);
  const [nom, setNom] = useState("");
  const [delai, setDelai] = useState("2");
  const [majoration, setMajoration] = useState("50");

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    try {
      await ajouter.mutateAsync({
        nom: nom.trim(),
        delaiJours: Math.max(0, Number(delai) || 0),
        majorationExpressPct: Math.max(0, Number(majoration) || 0),
        ordre: catalogue.services.length + 1,
      });
      toast.success(`Service « ${nom.trim()} » ajouté.`);
      setNom("");
      onFermer();
    } catch (err) {
      toast.error(messageErreur(err));
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <form onSubmit={soumettre}>
          <DialogHeader>
            <DialogTitle>Ajouter un service</DialogTitle>
            <DialogDescription>Par exemple « Amidonnage » ou « Teinture ».</DialogDescription>
          </DialogHeader>
          <div className="my-5 space-y-4">
            <Champ id="srv-nom" libelle="Nom du service">
              <Input
                id="srv-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
                className="h-11"
              />
            </Champ>
            <div className="grid grid-cols-2 gap-3">
              <Champ id="srv-delai" libelle="Délai (jours)">
                <Input
                  id="srv-delai"
                  inputMode="numeric"
                  value={delai}
                  onChange={(e) => setDelai(e.target.value.replace(/\D/g, ""))}
                  className="h-11"
                />
              </Champ>
              <Champ id="srv-maj" libelle="Majoration express (%)">
                <Input
                  id="srv-maj"
                  inputMode="numeric"
                  value={majoration}
                  onChange={(e) => setMajoration(e.target.value.replace(/\D/g, ""))}
                  className="h-11"
                />
              </Champ>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nom.trim() || ajouter.isPending}>
              {ajouter.isPending ? <Loader2 className="animate-spin" /> : null}
              Ajouter le service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CataloguePage() {
  const { pressing, peut } = useEspace();
  const { data, isLoading, error } = useCatalogue(pressing.id);
  const [dialogue, setDialogue] = useState<"article" | "service" | null>(null);
  const [filtre, setFiltre] = useState("");
  const modifiable = peut("gerer_catalogue");

  const groupes = useMemo(() => {
    if (!data) return [];
    const recherche = filtre.trim().toLowerCase();
    const articles = data.articles.filter(
      (a) => !recherche || a.nom.toLowerCase().includes(recherche),
    );
    const parCat = data.categories.map((c) => ({
      id: c.id,
      nom: c.nom,
      articles: articles.filter((a) => a.categorie_id === c.id),
    }));
    const sansCat = articles.filter(
      (a) => !a.categorie_id || !data.categories.some((c) => c.id === a.categorie_id),
    );
    if (sansCat.length) parCat.push({ id: "sans", nom: "Sans catégorie", articles: sansCat });
    return parCat.filter((g) => g.articles.length > 0);
  }, [data, filtre]);

  if (isLoading) return <Chargement />;
  if (error || !data)
    return (
      <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {messageErreur(error)}
      </p>
    );

  const idx = indexTarifs(data.tarifs);

  return (
    <>
      <PageHeader
        titre="Catalogue & tarifs"
        description="Prix communs à toutes vos boutiques, en FCFA. Cliquez sur un prix pour le modifier ; videz la case pour retirer le service."
        actions={
          modifiable ? (
            <>
              <Button variant="outline" onClick={() => setDialogue("service")}>
                <Plus />
                Service
              </Button>
              <Button onClick={() => setDialogue("article")}>
                <Plus />
                Article
              </Button>
            </>
          ) : null
        }
      />

      <Tabs defaultValue="articles">
        <TabsList className="mb-4 h-10 flex-wrap">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="kilo">Au kilo</TabsTrigger>
          <TabsTrigger value="forfaits">Forfaits</TabsTrigger>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
        </TabsList>
        <TabsContent value="kilo">
          <EditeurPrixKilo pressingId={pressing.id} catalogue={data} modifiable={modifiable} />
        </TabsContent>
        <TabsContent value="forfaits">
          <EditeurForfaits pressingId={pressing.id} catalogue={data} modifiable={modifiable} />
        </TabsContent>
        <TabsContent value="abonnements">
          <EditeurFormules pressingId={pressing.id} modifiable={modifiable} />
        </TabsContent>
        <TabsContent value="articles">
          <div className="mb-4 max-w-xs">
            <Input
              placeholder="Filtrer les articles…"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className="h-10"
            />
          </div>

          {data.articles.length === 0 ? (
            <EtatVide
              icone={Tags}
              titre="Catalogue vide"
              texte="Ajoutez vos articles et vos services pour commencer."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-muted/60">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[180px] bg-muted/60 px-4 py-3 text-left font-semibold">
                      Article
                    </th>
                    {data.services.map((s) => (
                      <th key={s.id} className="min-w-[110px] px-2 py-3 text-right font-semibold">
                        <span className="block">{s.nom}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {s.delai_jours} j · express +{s.majoration_express_pct} %
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {groupes.map((g) => (
                  <tbody key={g.id} className="border-t">
                    <tr>
                      <th
                        colSpan={data.services.length + 1}
                        className="sticky left-0 bg-card px-4 pt-4 pb-1 text-left text-xs font-semibold text-muted-foreground"
                      >
                        {g.nom}
                      </th>
                    </tr>
                    {g.articles.map((a) => (
                      <tr key={a.id} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="sticky left-0 bg-card px-4 py-1.5 font-medium">{a.nom}</td>
                        {data.services.map((s) => {
                          const t = idx.commun(a.id, s.id);
                          return (
                            <td key={s.id} className="px-1 py-1">
                              {modifiable ? (
                                <CellulePrix
                                  key={`${t?.id ?? "x"}-${t?.prix ?? ""}`}
                                  pressingId={pressing.id}
                                  articleId={a.id}
                                  serviceId={s.id}
                                  tarifId={t?.id}
                                  prix={t?.prix ?? null}
                                />
                              ) : (
                                <span className="montant block px-2 text-right">
                                  {t ? formatFCFA(t.prix, false) : "—"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {modifiable ? (
        <>
          <DialogueArticle
            ouvert={dialogue === "article"}
            onFermer={() => setDialogue(null)}
            catalogue={data}
            pressingId={pressing.id}
          />
          <DialogueService
            ouvert={dialogue === "service"}
            onFermer={() => setDialogue(null)}
            catalogue={data}
            pressingId={pressing.id}
          />
        </>
      ) : null}
    </>
  );
}
