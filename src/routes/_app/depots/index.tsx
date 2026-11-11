import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ScanLine, Search, Shirt } from "lucide-react";
import { toast } from "sonner";

import { BadgeStatutDepot, BadgeStatutPaiement } from "@/components/common/Badges";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
  depotParNumero,
  TAILLE_PAGE_DEPOTS,
  useDepots,
  type DepotListe,
  type OngletDepots,
  type Periode,
} from "@/hooks/useDepots";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatFCFA, toISODate } from "@/lib/format";
import type { StatutPaiementDepot } from "@/lib/types";
import { cn } from "@/lib/utils";

const ONGLETS: { id: OngletDepots; libelle: string }[] = [
  { id: "a_traiter", libelle: "À traiter" },
  { id: "prets", libelle: "Prêts" },
  { id: "retard", libelle: "En retard" },
  { id: "impayes", libelle: "Impayés" },
  { id: "tous", libelle: "Tous" },
];
const PERIODES: Periode[] = ["tout", "jour", "7j", "30j"];
const PAIEMENTS: (StatutPaiementDepot | "tous")[] = ["tous", "non_solde", "partiel", "solde"];

interface Recherche {
  onglet?: OngletDepots;
  q?: string;
  periode?: Periode;
  paiement?: StatutPaiementDepot;
}

export const Route = createFileRoute("/_app/depots/")({
  head: () => ({ meta: [{ title: "Dépôts — PREX’ING" }] }),
  validateSearch: (s: Record<string, unknown>): Recherche => {
    const r: Recherche = {};
    const o = s["onglet"];
    if (typeof o === "string" && ONGLETS.some((x) => x.id === o)) r.onglet = o as OngletDepots;
    if (typeof s["q"] === "string" && s["q"]) r.q = s["q"];
    const p = s["periode"];
    if (typeof p === "string" && (PERIODES as string[]).includes(p)) r.periode = p as Periode;
    const pa = s["paiement"];
    if (typeof pa === "string" && (PAIEMENTS as string[]).includes(pa) && pa !== "tous")
      r.paiement = pa as StatutPaiementDepot;
    return r;
  },
  component: DepotsPage,
});

const enRetard = (d: DepotListe) =>
  Boolean(d.date_retrait_prevue) &&
  d.date_retrait_prevue! < toISODate(new Date()) &&
  d.statut !== "retire" &&
  d.statut !== "annule";

const nbPieces = (d: DepotListe) => d.depot_lignes.reduce((a, l) => a + l.quantite, 0);

function DepotsPage() {
  const { boutique } = useEspace();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const onglet = search.onglet ?? "a_traiter";
  const periode = search.periode ?? "tout";
  const paiement = search.paiement ?? "tous";
  const [saisie, setSaisie] = useState(search.q ?? "");
  const [page, setPage] = useState(0);
  const recherche = useDebounce(saisie, 300);
  const { data, isLoading, isFetching, error } = useDepots({
    boutiqueId: boutique.id,
    onglet,
    recherche,
    periode,
    paiement,
    page,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / TAILLE_PAGE_DEPOTS)) : 1;

  const majRecherche = (patch: { [K in keyof Recherche]?: Recherche[K] | undefined }) => {
    setPage(0);
    const suivant: Record<string, unknown> = { ...search, ...patch };
    for (const k of Object.keys(suivant)) if (suivant[k] === undefined) delete suivant[k];
    void navigate({ to: "/depots", search: suivant as Recherche, replace: true });
  };

  // Douchette : le code scanné se termine par Entrée → ouverture directe du dépôt.
  async function surEntree(e: FormEvent) {
    e.preventDefault();
    if (!/-/.test(saisie)) return;
    const id = await depotParNumero(boutique.id, saisie);
    if (id) void navigate({ to: "/depots/$id", params: { id } });
    else toast.error(`Aucun dépôt ${saisie.trim()} dans cette boutique.`);
  }

  return (
    <>
      <PageHeader
        titre="Dépôts"
        description={data ? `${data.total} dépôt${data.total > 1 ? "s" : ""}` : undefined}
        actions={
          <Button asChild className="h-10">
            <Link to="/comptoir">Nouveau dépôt</Link>
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <form onSubmit={(e) => void surEntree(e)} className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              setPage(0);
            }}
            placeholder="N° de dépôt, nom ou téléphone — ou scannez une étiquette"
            className="h-11 pr-10 pl-9"
            aria-label="Rechercher un dépôt"
            autoFocus
          />
          <ScanLine className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
        </form>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={onglet} onValueChange={(o) => majRecherche({ onglet: o as OngletDepots })}>
            <TabsList className="h-10 flex-wrap">
              {ONGLETS.map((o) => (
                <TabsTrigger key={o.id} value={o.id}>
                  {o.libelle}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Select value={periode} onValueChange={(p) => majRecherche({ periode: p as Periode })}>
              <SelectTrigger className="h-10 w-[150px]" aria-label="Période">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tout">Toutes dates</SelectItem>
                <SelectItem value="jour">Aujourd’hui</SelectItem>
                <SelectItem value="7j">7 derniers jours</SelectItem>
                <SelectItem value="30j">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paiement}
              onValueChange={(p) =>
                majRecherche({ paiement: p === "tous" ? undefined : (p as StatutPaiementDepot) })
              }
            >
              <SelectTrigger className="h-10 w-[150px]" aria-label="Paiement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tout paiement</SelectItem>
                <SelectItem value="non_solde">Non soldé</SelectItem>
                <SelectItem value="partiel">Partiel</SelectItem>
                <SelectItem value="solde">Soldé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? <Chargement /> : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {messageErreur(error)}
        </p>
      ) : null}

      {data && data.depots.length === 0 ? (
        <EtatVide
          icone={Shirt}
          titre={recherche ? "Aucun dépôt trouvé" : "Aucun dépôt dans cette liste"}
          texte={recherche ? "Vérifiez le numéro, le nom ou le téléphone." : undefined}
        />
      ) : null}

      {data && data.depots.length > 0 ? (
        <div className={cn("transition-opacity", isFetching && "opacity-60")}>
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Dépôt</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Déposé</th>
                  <th className="px-4 py-3 font-medium">Retrait prévu</th>
                  <th className="px-4 py-3 text-right font-medium">Pièces</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                  <th className="px-4 py-3 text-right font-medium">Reste</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Casier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.depots.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => void navigate({ to: "/depots/$id", params: { id: d.id } })}
                  >
                    <td className="px-4 py-3 font-semibold">
                      <Link to="/depots/$id" params={{ id: d.id }} className="hover:underline">
                        {d.numero}
                      </Link>
                      {d.express ? (
                        <span className="ml-1.5 text-xs font-medium text-warning">express</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{d.clients?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(d.created_at)}</td>
                    <td
                      className={cn("px-4 py-3", enRetard(d) && "font-semibold text-destructive")}
                    >
                      {formatDate(d.date_retrait_prevue)}
                    </td>
                    <td className="montant px-4 py-3 text-right">{nbPieces(d)}</td>
                    <td className="montant px-4 py-3 text-right">{formatFCFA(d.net_a_payer)}</td>
                    <td
                      className={cn(
                        "montant px-4 py-3 text-right",
                        d.reste_a_payer > 0 &&
                          d.statut !== "annule" &&
                          "font-semibold text-destructive",
                      )}
                    >
                      {d.reste_a_payer > 0 ? formatFCFA(d.reste_a_payer) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <BadgeStatutDepot statut={d.statut} />
                        {d.statut !== "annule" ? (
                          <BadgeStatutPaiement statut={d.statut_paiement} />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.emplacement ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {data.depots.map((d) => (
              <li key={d.id}>
                <Link
                  to="/depots/$id"
                  params={{ id: d.id }}
                  className="block rounded-xl border bg-card p-3 active:bg-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{d.numero}</p>
                      <p className="truncate text-sm">{d.clients?.nom}</p>
                    </div>
                    <BadgeStatutDepot statut={d.statut} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className={cn(enRetard(d) && "font-semibold text-destructive")}>
                      Retrait {formatDate(d.date_retrait_prevue)} · {nbPieces(d)} pièce
                      {nbPieces(d) > 1 ? "s" : ""}
                    </span>
                    {d.reste_a_payer > 0 && d.statut !== "annule" ? (
                      <span className="montant font-semibold text-destructive">
                        reste {formatFCFA(d.reste_a_payer)}
                      </span>
                    ) : (
                      <span className="montant">{formatFCFA(d.net_a_payer)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} sur {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                  <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
