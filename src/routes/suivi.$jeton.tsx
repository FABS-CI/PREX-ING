import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, MapPin, MessageCircle, Phone, Truck } from "lucide-react";

import { Chargement } from "@/components/common/Chargement";
import { PageClient } from "@/components/common/PageClient";
import { Button } from "@/components/ui/button";
import { useSuivi } from "@/hooks/usePortail";
import {
  formatDate,
  formatDateHeure,
  formatFCFA,
  formatTelephone,
  lienWhatsApp,
} from "@/lib/format";
import type { StatutDepot } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suivi/$jeton")({
  head: () => ({
    meta: [{ title: "Suivi de votre dépôt" }, { name: "robots", content: "noindex" }],
  }),
  component: Suivi,
});

const ETAPES: { statuts: StatutDepot[]; libelle: string }[] = [
  { statuts: ["en_attente", "recu"], libelle: "Reçu" },
  { statuts: ["en_traitement"], libelle: "En traitement" },
  { statuts: ["pret", "en_livraison"], libelle: "Prêt" },
  { statuts: ["retire"], libelle: "Récupéré" },
];

function Suivi() {
  const { jeton } = Route.useParams();
  const { data: s, isLoading } = useSuivi(jeton);
  if (isLoading) return <Chargement plein />;
  if (!s) {
    return (
      <PageClient>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">Dépôt introuvable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce lien de suivi n’est pas valide. Scannez de nouveau le QR code de votre ticket.
          </p>
        </div>
      </PageClient>
    );
  }
  const annule = s.statut === "annule";
  const etape = ETAPES.findIndex((e) => e.statuts.includes(s.statut));
  const pieces = s.lignes.reduce((a, l) => a + l.quantite, 0);
  const tel = s.boutique.telephone;
  const messagePret =
    s.statut === "pret"
      ? "Votre linge est prêt, vous pouvez venir le récupérer."
      : s.statut === "en_livraison"
        ? "Votre linge est en route."
        : null;

  return (
    <PageClient>
      <p className="text-sm text-muted-foreground">
        {s.pressing.nom} · {s.boutique.nom}
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Bonjour {s.client}</h1>
      <p className="text-sm text-muted-foreground">
        Dépôt <span className="montant font-semibold text-foreground">{s.numero}</span> · déposé le{" "}
        {formatDateHeure(s.depose_le)}
      </p>

      {annule ? (
        <p className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          Ce dépôt a été annulé. Contactez le pressing pour plus d’informations.
        </p>
      ) : (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <ol className="grid grid-cols-4 gap-2">
            {ETAPES.map((e, i) => (
              <li key={e.libelle} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                    i < etape
                      ? "border-success bg-success text-success-foreground"
                      : i === etape
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {i < etape ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    i <= etape ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {e.libelle}
                </span>
              </li>
            ))}
          </ol>
          {messagePret ? (
            <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-center text-sm font-medium text-success">
              {messagePret}
            </p>
          ) : null}
          {s.statut !== "retire" && s.retrait_prevu ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Retrait prévu le{" "}
              <strong className="text-foreground">{formatDate(s.retrait_prevu)}</strong>
              {s.express ? " · express" : ""}
            </p>
          ) : null}
          {s.retire_le ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Récupéré le {formatDateHeure(s.retire_le)}
            </p>
          ) : null}
        </section>
      )}

      {s.livraison && s.livraison.statut !== "effectue" ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Truck className="size-4 text-info" />
          {s.livraison.type === "livraison" ? "Livraison" : "Ramassage"}{" "}
          {s.livraison.statut === "en_cours" ? "en route" : "programmé"}
          {s.livraison.creneau_debut ? ` le ${formatDate(s.livraison.creneau_debut)}` : ""}
        </p>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y">
          {s.lignes.map((l, i) => (
            <li key={i} className="flex justify-between px-4 py-2.5 text-sm">
              <span>{l.libelle}</span>
              <span className="text-muted-foreground">× {l.quantite}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {pieces} pièce{pieces > 1 ? "s" : ""} · total
            </dt>
            <dd className="montant">{formatFCFA(s.net_a_payer)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Déjà payé</dt>
            <dd className="montant">{formatFCFA(s.deja_paye)}</dd>
          </div>
          <div
            className={cn(
              "flex justify-between font-semibold",
              s.reste_a_payer > 0 ? "text-destructive" : "text-success",
            )}
          >
            <dt>Reste à payer</dt>
            <dd className="montant">{formatFCFA(s.reste_a_payer)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border bg-card p-4 text-sm">
        <p className="font-semibold">{s.boutique.nom}</p>
        {[s.boutique.adresse, s.boutique.commune].filter(Boolean).length ? (
          <p className="mt-1 flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {[s.boutique.adresse, s.boutique.commune].filter(Boolean).join(", ")}
          </p>
        ) : null}
        {tel ? (
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" className="h-11">
              <a href={`tel:${tel}`}>
                <Phone />
                {formatTelephone(tel)}
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a
                href={lienWhatsApp(tel, `Bonjour, au sujet de mon dépôt ${s.numero}`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                WhatsApp
              </a>
            </Button>
          </div>
        ) : null}
        {s.pressing.slug ? (
          <Link
            to="/p/$slug"
            params={{ slug: s.pressing.slug }}
            className="mt-3 inline-block text-primary underline dark:text-info"
          >
            Tarifs et ramassage à domicile
          </Link>
        ) : null}
      </section>
    </PageClient>
  );
}
