import { createFileRoute, Link } from "@tanstack/react-router";
import { AlarmClock, CheckCircle2, LogIn, LogOut, Plus, Shirt, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { messageErreur } from "@/lib/erreurs";

import { BadgeStatutDepot } from "@/components/common/Badges";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { Button } from "@/components/ui/button";
import { useEspace } from "@/contexts/SessionContext";
import { useEtatPointage, usePointer } from "@/hooks/useEquipe";
import { useTableauDeBord } from "@/hooks/useTableauDeBord";
import { formatDate, formatFCFA } from "@/lib/format";
import type { StatutDepot } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord — PREX’ING" }] }),
  component: TableauDeBordPage,
});

function Indicateur({
  libelle,
  valeur,
  detail,
  ton = "neutre",
}: {
  libelle: string;
  valeur: string;
  detail?: string;
  ton?: "neutre" | "alerte" | "succes";
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{libelle}</p>
      <p
        className={cn(
          "montant mt-1 text-2xl font-bold tracking-tight",
          ton === "alerte" && "text-destructive",
          ton === "succes" && "text-success",
        )}
      >
        {valeur}
      </p>
      {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function CartePointage({ pressingId }: { pressingId: string }) {
  const { data: etat } = useEtatPointage(pressingId);
  const pointer = usePointer(pressingId);
  if (!etat) return null;
  const present = Boolean(etat.arrivee);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <span>
        {present
          ? `Arrivé à ${new Date(etat.arrivee!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
          : "Vous n’avez pas encore pointé aujourd’hui."}
      </span>
      <Button
        size="sm"
        variant={present ? "outline" : "default"}
        disabled={pointer.isPending}
        onClick={() =>
          pointer
            .mutateAsync()
            .then((e) =>
              toast.success(
                e.arrivee
                  ? "Arrivée enregistrée. Bonne journée !"
                  : "Départ enregistré. À demain !",
              ),
            )
            .catch((e: unknown) => toast.error(messageErreur(e)))
        }
      >
        {present ? <LogOut /> : <LogIn />}
        {present ? "Pointer mon départ" : "Pointer mon arrivée"}
      </Button>
    </div>
  );
}

function TableauDeBordPage() {
  const { pressing, boutique, profil } = useEspace();
  const { data, isLoading, error } = useTableauDeBord(pressing.id, boutique.id);
  const prenom = profil?.nom?.split(" ")[0];
  const aujourdHui = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{aujourdHui}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {prenom ? `Bonjour ${prenom}` : "Bonjour"}
          </h1>
        </div>
        <Button asChild size="lg" className="h-11">
          <Link to="/comptoir">
            <Plus />
            Nouveau dépôt
          </Link>
        </Button>
      </div>

      <CartePointage pressingId={pressing.id} />

      {isLoading ? <Chargement /> : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger le tableau de bord : {(error as Error).message}
        </p>
      ) : null}

      {data ? (
        <>
          <section
            aria-label="Chiffres du jour"
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex flex-col gap-1 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-primary-foreground/75">Encaissé aujourd’hui</p>
                <p className="montant text-4xl font-extrabold tracking-tight">
                  {formatFCFA(data.encaissementsDuJour)}
                </p>
              </div>
              {data.aVerifierDuJour > 0 ? (
                <p className="text-sm text-primary-foreground/80">
                  +{" "}
                  <span className="montant font-semibold">{formatFCFA(data.aVerifierDuJour)}</span>{" "}
                  en mobile money à vérifier
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0">
              <Indicateur
                libelle="Dépôts du jour"
                valeur={String(data.depotsDuJour)}
                detail={`${data.articlesDuJour} pièce${data.articlesDuJour > 1 ? "s" : ""}`}
              />
              <Indicateur
                libelle="Prêts à retirer"
                valeur={String(data.prets)}
                ton={data.prets ? "succes" : "neutre"}
              />
              <Indicateur
                libelle="Retraits en retard"
                valeur={String(data.enRetard.length)}
                ton={data.enRetard.length ? "alerte" : "neutre"}
              />
              <Indicateur
                libelle="Total des impayés"
                valeur={formatFCFA(data.impayes)}
                detail={`${data.nbImpayes} dépôt${data.nbImpayes > 1 ? "s" : ""}`}
                ton={data.impayes ? "alerte" : "neutre"}
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card">
              <header className="flex items-center gap-2 border-b px-5 py-3">
                <AlarmClock className="size-4 text-destructive" />
                <h2 className="font-semibold">Retraits en retard</h2>
              </header>
              {data.enRetard.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-5 text-success" />
                  Aucun retrait en retard.
                </div>
              ) : (
                <ul className="divide-y">
                  {data.enRetard.map((d) => (
                    <li key={d.id}>
                      <Link
                        to="/depots/$id"
                        params={{ id: d.id }}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.client_nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.numero} · prévu le {formatDate(d.date_retrait_prevue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-destructive">
                            {d.jours_retard} j de retard
                          </p>
                          {d.reste_a_payer > 0 ? (
                            <p className="montant text-xs text-muted-foreground">
                              reste {formatFCFA(d.reste_a_payer)}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border bg-card">
              <header className="flex items-center gap-2 border-b px-5 py-3">
                <Shirt className="size-4 text-info" />
                <h2 className="font-semibold">Derniers dépôts</h2>
              </header>
              {data.derniersDepots.length === 0 ? (
                <div className="p-5">
                  <EtatVide
                    icone={Shirt}
                    titre="Aucun dépôt pour l’instant"
                    texte="Enregistrez le premier dépôt au comptoir."
                    action={
                      <Button asChild>
                        <Link to="/comptoir">Ouvrir le comptoir</Link>
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y">
                  {data.derniersDepots.map((d) => (
                    <li key={d.id}>
                      <Link
                        to="/depots/$id"
                        params={{ id: d.id }}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.client_nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.numero} · retrait {formatDate(d.date_retrait_prevue)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="montant text-sm font-semibold">
                            {formatFCFA(d.net_a_payer)}
                          </span>
                          <BadgeStatutDepot statut={d.statut as StatutDepot} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data.nbImpayes > 0 ? (
            <Link
              to="/clients"
              search={{ onglet: "debiteurs" }}
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15"
            >
              <TriangleAlert className="size-4 shrink-0 text-warning" />
              <span>
                {data.nbImpayes} dépôt{data.nbImpayes > 1 ? "s" : ""} avec un reste à payer. Voir
                les clients débiteurs.
              </span>
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
