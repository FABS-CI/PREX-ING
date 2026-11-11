import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, UserPlus, Users } from "lucide-react";

import { ClientDialog } from "@/components/clients/ClientForm";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import { TAILLE_PAGE, useClients, type OngletClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatFCFA, formatTelephone, initiales } from "@/lib/format";
import { cn } from "@/lib/utils";

const ONGLETS: OngletClients[] = ["tous", "debiteurs", "inactifs"];

export const Route = createFileRoute("/_app/clients/")({
  head: () => ({ meta: [{ title: "Clients — PREX’ING" }] }),
  validateSearch: (s: Record<string, unknown>): { onglet?: OngletClients } => {
    const o = s["onglet"];
    return typeof o === "string" && (ONGLETS as string[]).includes(o)
      ? { onglet: o as OngletClients }
      : {};
  },
  component: ClientsPage,
});

function ClientsPage() {
  const { pressing } = useEspace();
  const navigate = useNavigate();
  const { onglet = "tous" } = Route.useSearch();
  const [saisie, setSaisie] = useState("");
  const [page, setPage] = useState(0);
  const [nouveau, setNouveau] = useState(false);
  const recherche = useDebounce(saisie, 250);
  const { data, isLoading, isFetching, error } = useClients(pressing.id, recherche, onglet, page);
  const pages = data ? Math.max(1, Math.ceil(data.total / TAILLE_PAGE)) : 1;

  const changerOnglet = (o: string) => {
    setPage(0);
    void navigate({
      to: "/clients",
      search: o === "tous" ? {} : { onglet: o as OngletClients },
      replace: true,
    });
  };

  return (
    <>
      <PageHeader
        titre="Clients"
        description={data ? `${data.total} client${data.total > 1 ? "s" : ""}` : undefined}
        actions={
          <Button onClick={() => setNouveau(true)} className="h-10">
            <UserPlus />
            Nouveau client
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              setPage(0);
            }}
            placeholder="Nom ou téléphone"
            className="h-11 pl-9"
            aria-label="Rechercher un client"
          />
        </div>
        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList className="h-10">
            <TabsTrigger value="tous">Tous</TabsTrigger>
            <TabsTrigger value="debiteurs">Débiteurs</TabsTrigger>
            <TabsTrigger value="inactifs">Inactifs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? <Chargement /> : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {messageErreur(error)}
        </p>
      ) : null}

      {data && data.clients.length === 0 ? (
        <EtatVide
          icone={Users}
          titre={
            recherche
              ? "Aucun client trouvé"
              : onglet === "debiteurs"
                ? "Aucun client débiteur"
                : "Aucun client"
          }
          texte={
            recherche
              ? "Vérifiez l’orthographe ou le numéro, ou créez le client."
              : onglet === "tous"
                ? "Les clients sont créés ici ou directement au comptoir."
                : undefined
          }
          action={
            onglet === "tous" ? (
              <Button onClick={() => setNouveau(true)}>
                <UserPlus />
                Nouveau client
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {data && data.clients.length > 0 ? (
        <div className={cn("transition-opacity", isFetching && "opacity-60")}>
          {/* Ordinateur : tableau */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Téléphone</th>
                  <th className="px-4 py-3 text-right font-medium">Dépôts</th>
                  <th className="px-4 py-3 text-right font-medium">Total dépensé</th>
                  <th className="px-4 py-3 text-right font-medium">Solde dû</th>
                  <th className="px-4 py-3 text-right font-medium">Dernière visite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.clients.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => void navigate({ to: "/clients/$id", params: { id: c.id } })}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/clients/$id"
                        params={{ id: c.id }}
                        className="font-medium hover:underline"
                      >
                        {c.nom}
                      </Link>
                    </td>
                    <td className="montant px-4 py-3 text-muted-foreground">
                      {formatTelephone(c.telephone)}
                    </td>
                    <td className="montant px-4 py-3 text-right">{c.nb_depots}</td>
                    <td className="montant px-4 py-3 text-right">{formatFCFA(c.total_depense)}</td>
                    <td
                      className={cn(
                        "montant px-4 py-3 text-right",
                        c.solde_du > 0 && "font-semibold text-destructive",
                      )}
                    >
                      {c.solde_du > 0 ? formatFCFA(c.solde_du) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatDate(c.derniere_visite)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Téléphone : cartes */}
          <ul className="space-y-2 md:hidden">
            {data.clients.map((c) => (
              <li key={c.id}>
                <Link
                  to="/clients/$id"
                  params={{ id: c.id }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                    {initiales(c.nom)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.nom}</span>
                    <span className="montant block text-xs text-muted-foreground">
                      {formatTelephone(c.telephone)} · {c.nb_depots} dépôt
                      {c.nb_depots > 1 ? "s" : ""}
                    </span>
                  </span>
                  {c.solde_du > 0 ? (
                    <span className="montant text-sm font-semibold text-destructive">
                      {formatFCFA(c.solde_du)}
                    </span>
                  ) : null}
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

      <ClientDialog
        ouvert={nouveau}
        onFermer={() => setNouveau(false)}
        pressingId={pressing.id}
        mode="complet"
        saisieInitiale={saisie}
        onEnregistre={(c) => {
          setNouveau(false);
          void navigate({ to: "/clients/$id", params: { id: c.id } });
        }}
      />
    </>
  );
}
