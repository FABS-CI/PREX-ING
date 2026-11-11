import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, Printer } from "lucide-react";

import { Chargement } from "@/components/common/Chargement";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useEspace } from "@/contexts/SessionContext";
import { useRapport, type LigneRapport, type Rapport } from "@/hooks/useGestion";
import { messageErreur } from "@/lib/erreurs";
import { imprimerRapport, telechargerCsv, type Section } from "@/lib/export";
import { formatDate, formatFCFA, ajouterJours, toISODate } from "@/lib/format";
import { joursDe, periode, type CodePeriode } from "@/lib/periode";
import { LIBELLES_MOYEN } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/rapports")({
  head: () => ({ meta: [{ title: "Rapports — PREX’ING" }] }),
  component: RapportsPage,
});

const PERIODES: { id: CodePeriode; libelle: string }[] = [
  { id: "jour", libelle: "Aujourd’hui" },
  { id: "semaine", libelle: "Cette semaine" },
  { id: "mois", libelle: "Ce mois-ci" },
  { id: "mois_precedent", libelle: "Mois dernier" },
  { id: "annee", libelle: "Cette année" },
];

function Tableau({
  titre,
  lignes,
  colonneNombre,
  vide,
}: {
  titre: string;
  lignes: LigneRapport[];
  colonneNombre?: string;
  vide?: string;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.montant));
  return (
    <section className="rounded-2xl border bg-card">
      <h2 className="border-b px-5 py-3 font-semibold">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          {vide ?? "Aucune donnée sur la période."}
        </p>
      ) : (
        <ul className="divide-y">
          {lignes.map((l) => (
            <li key={l.cle} className="px-5 py-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {l.libelle}
                  {colonneNombre ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.nombre} {colonneNombre}
                    </span>
                  ) : null}
                </span>
                <span className="montant font-semibold">{formatFCFA(l.montant)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary dark:bg-info"
                  style={{ width: `${(l.montant / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sections(r: Rapport): Section[] {
  const t = (titre: string, l: LigneRapport[], n = "Nombre"): Section => ({
    titre,
    colonnes: ["Libellé", n, "Montant (FCFA)"],
    lignes: l.map((x) => [x.libelle, x.nombre, x.montant]),
  });
  return [
    {
      titre: "Synthèse",
      colonnes: ["Indicateur", "Valeur (FCFA)"],
      lignes: [
        ["Chiffre d’affaires (dépôts)", r.chiffreAffaires],
        ["Nombre de dépôts", r.nbDepots],
        ["Pièces traitées", r.pieces],
        ["Encaissements validés", r.encaissements],
        ["Mobile money à vérifier", r.aVerifier],
        ["Dépenses", r.depenses],
        ["Bénéfice simplifié (encaissements − dépenses)", r.benefice],
      ],
    },
    t("Encaissements par moyen de paiement", r.parMoyen, "Paiements"),
    t("Chiffre d’affaires par service", r.parService, "Pièces"),
    t("Encaissements par employé", r.parEmploye, "Paiements"),
    t("Dépenses par catégorie", r.parCategorieDepense, "Dépenses"),
    t("Meilleurs clients", r.topClients, "Dépôts"),
    t("Articles les plus traités", r.topArticles, "Pièces"),
    {
      titre: "Par jour",
      colonnes: ["Jour", "Encaissements", "Dépenses"],
      lignes: r.parJour.map((j) => [formatDate(j.jour), j.encaissements, j.depenses]),
    },
  ];
}

function RapportsPage() {
  const { boutique, boutiques, role, pressing } = useEspace();
  const [code, setCode] = useState<CodePeriode>("mois");
  const [toutes, setToutes] = useState(false);
  const p = useMemo(() => periode(code), [code]);
  const jours = useMemo(() => joursDe(p), [p]);
  const ids = toutes ? boutiques.map((b) => b.id) : [boutique.id];
  const { data, isLoading, error } = useRapport(ids, p, jours, (m) => LIBELLES_MOYEN[m]);
  const portee = toutes ? "Toutes les boutiques" : boutique.nom;
  const sousTitre = `${portee} · du ${formatDate(p.debut)} au ${formatDate(ajouterJours(p.fin, -1))}`;
  const maxJour = Math.max(
    1,
    ...(data?.parJour ?? []).map((j) => Math.max(j.encaissements, j.depenses)),
  );

  return (
    <>
      <PageHeader
        titre="Rapports"
        description={sousTitre}
        actions={
          data ? (
            <>
              <Button
                variant="outline"
                className="h-10"
                onClick={() =>
                  telechargerCsv(
                    `prexing-rapport-${toISODate(p.debut)}.csv`,
                    `${pressing.nom} — Rapport`,
                    sections(data),
                  )
                }
              >
                <FileDown />
                Excel
              </Button>
              <Button
                variant="outline"
                className="h-10"
                onClick={() =>
                  imprimerRapport(`${pressing.nom} — Rapport`, sousTitre, sections(data))
                }
              >
                <Printer />
                PDF
              </Button>
            </>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {PERIODES.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setCode(x.id)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-medium",
              code === x.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {x.libelle}
          </button>
        ))}
        {role === "proprietaire" && boutiques.length > 1 ? (
          <button
            type="button"
            onClick={() => setToutes((t) => !t)}
            className={cn(
              "ml-auto h-9 rounded-full border px-3.5 text-sm font-medium",
              toutes ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {toutes ? "Toutes les boutiques" : "Cette boutique"}
          </button>
        ) : null}
      </div>

      {isLoading ? <Chargement texte="Calcul du rapport…" /> : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {messageErreur(error)}
        </p>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0">
              {[
                [
                  "Chiffre d’affaires",
                  formatFCFA(data.chiffreAffaires),
                  `${data.nbDepots} dépôts · ${data.pieces} pièces`,
                ],
                [
                  "Encaissé",
                  formatFCFA(data.encaissements),
                  data.aVerifier
                    ? `+ ${formatFCFA(data.aVerifier)} à vérifier`
                    : "paiements validés",
                ],
                ["Dépenses", formatFCFA(data.depenses), "sur la période"],
                ["Bénéfice simplifié", formatFCFA(data.benefice), "encaissé − dépenses"],
              ].map(([l, v, d], i) => (
                <div key={l} className="px-5 py-4">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p
                    className={cn(
                      "montant mt-1 text-2xl font-bold tracking-tight",
                      i === 3 && (data.benefice < 0 ? "text-destructive" : "text-success"),
                    )}
                  >
                    {v}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </section>

          {data.parJour.length > 1 ? (
            <section className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Par jour</h2>
                <span className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-primary dark:bg-info" />
                    Encaissé
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-sm bg-warning" />
                    Dépenses
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex h-40 min-w-max items-end gap-1">
                  {data.parJour.map((j) => (
                    <div
                      key={j.jour}
                      className="flex w-5 flex-col items-center gap-1"
                      title={`${formatDate(j.jour)} : ${formatFCFA(j.encaissements)} encaissés, ${formatFCFA(j.depenses)} de dépenses`}
                    >
                      <div className="flex h-32 items-end gap-px">
                        <div
                          className="w-2 rounded-t bg-primary dark:bg-info"
                          style={{ height: `${(j.encaissements / maxJour) * 100}%` }}
                        />
                        <div
                          className="w-2 rounded-t bg-warning"
                          style={{ height: `${(j.depenses / maxJour) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{j.jour.slice(8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Tableau titre="Encaissements par moyen" lignes={data.parMoyen} />
            <Tableau
              titre="Chiffre d’affaires par service"
              lignes={data.parService}
              colonneNombre="pièces"
            />
            <Tableau titre="Encaissements par employé" lignes={data.parEmploye} />
            <Tableau titre="Dépenses par catégorie" lignes={data.parCategorieDepense} />
            <Tableau titre="Meilleurs clients" lignes={data.topClients} colonneNombre="dépôts" />
            <Tableau
              titre="Articles les plus traités"
              lignes={data.topArticles}
              colonneNombre="pièces"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Les salaires seront déduits du bénéfice quand le module Équipe sera en place.
          </p>
        </div>
      ) : null}
    </>
  );
}
