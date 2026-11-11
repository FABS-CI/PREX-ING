import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Package, Plus, Repeat, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Catalogue } from "@/hooks/useCatalogue";
import {
  prixKiloPour,
  type AbonnementActif,
  type Forfait,
  type PrixKilo,
} from "@/hooks/useModesAvances";
import { poidsFacture, type LignePanier } from "@/lib/comptoir";
import { formatDate, formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/** « 4,5 » ou « 4.5 » → 4.5 */
export function lirePoids(saisie: string): number {
  const n = Number(saisie.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function PanneauKilo({
  catalogue,
  prixKilo,
  boutiqueId,
  onAjouter,
}: {
  catalogue: Catalogue;
  prixKilo: PrixKilo[];
  boutiqueId: string;
  onAjouter: (l: LignePanier) => void;
}) {
  const services = catalogue.services.filter(
    (s) => s.actif && prixKiloPour(prixKilo, s.id, boutiqueId),
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [poids, setPoids] = useState("");
  const [pieces, setPieces] = useState("");
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const tarif = service ? prixKiloPour(prixKilo, service.id, boutiqueId) : undefined;

  if (!service || !tarif) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun prix au kilo n’est défini. Ajoutez-les dans{" "}
        <Link to="/catalogue" className="font-medium text-primary underline dark:text-info">
          Catalogue & tarifs
        </Link>
        .
      </p>
    );
  }

  const p = lirePoids(poids);
  const nb = Number(pieces.replace(/\D/g, "")) || 0;
  const facture = poidsFacture({ poidsKg: p, poidsMinKg: tarif.poids_min });
  const ok = p > 0 && nb > 0;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Scale className="size-4" />
        Pesée du linge
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Service au kilo">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === service.id}
            onClick={() => setServiceId(s.id)}
            className={cn(
              "h-11 rounded-xl border px-4 text-sm font-semibold",
              s.id === service.id ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {s.nom} · {formatFCFA(prixKiloPour(prixKilo, s.id, boutiqueId)?.prix_kg ?? 0)}/kg
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="poids">Poids (kg)</Label>
          <Input
            id="poids"
            inputMode="decimal"
            placeholder="4,5"
            value={poids}
            onChange={(e) => setPoids(e.target.value)}
            className="h-12 text-right text-lg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pieces">Nombre de pièces</Label>
          <Input
            id="pieces"
            inputMode="numeric"
            placeholder="12"
            value={pieces}
            onChange={(e) => setPieces(e.target.value)}
            className="h-12 text-right text-lg"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Minimum facturé : {String(tarif.poids_min).replace(".", ",")} kg.
        {p > 0 ? (
          <>
            {" "}
            Facturé :{" "}
            <strong className="text-foreground">
              {String(facture).replace(".", ",")} kg
            </strong> ={" "}
            <strong className="montant text-foreground">
              {formatFCFA(Math.round(facture * tarif.prix_kg))}
            </strong>
          </>
        ) : null}
      </p>
      <Button
        className="h-12 w-full text-base"
        disabled={!ok}
        onClick={() => {
          onAjouter({
            cle: `kilo-${service.id}-${crypto.randomUUID()}`,
            type: "kilo",
            articleId: "",
            serviceId: service.id,
            articleNom: `Linge au kilo — ${service.nom}`,
            serviceNom: service.nom,
            quantite: nb,
            prixBase: tarif.prix_kg,
            majorationExpressPct: service.majoration_express_pct,
            delaiJours: service.delai_jours,
            poidsKg: p,
            poidsMinKg: tarif.poids_min,
            observations: p < tarif.poids_min ? `Poids réel ${String(p).replace(".", ",")} kg` : "",
          });
          setPoids("");
          setPieces("");
        }}
      >
        <Plus />
        Ajouter au panier
      </Button>
    </div>
  );
}

export function PanneauForfaits({
  catalogue,
  forfaits,
  onAjouter,
}: {
  catalogue: Catalogue;
  forfaits: Forfait[];
  onAjouter: (l: LignePanier) => void;
}) {
  const actifs = forfaits.filter((f) => f.actif);
  if (actifs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucun forfait. Créez-en un dans{" "}
        <Link to="/catalogue" className="font-medium text-primary underline dark:text-info">
          Catalogue & tarifs
        </Link>{" "}
        (ex. « 10 chemises = 8 000 FCFA »).
      </p>
    );
  }
  const nomArticle = (id: string) => catalogue.articles.find((a) => a.id === id)?.nom ?? "Article";
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {actifs.map((f) => {
          const pieces = f.contenu.reduce((a, c) => a + c.quantite, 0);
          const delai = Math.max(
            1,
            ...f.contenu.map(
              (c) => catalogue.services.find((s) => s.id === c.service_id)?.delai_jours ?? 1,
            ),
          );
          return (
            <button
              key={f.id}
              type="button"
              onClick={() =>
                onAjouter({
                  cle: `lot-${f.id}-${crypto.randomUUID()}`,
                  type: "lot",
                  articleId: "",
                  serviceId: f.contenu[0]?.service_id ?? "",
                  articleNom: f.nom,
                  serviceNom: "Forfait",
                  quantite: pieces,
                  prixBase: 0,
                  prixLot: f.prix,
                  forfaitId: f.id,
                  majorationExpressPct: 0,
                  delaiJours: delai,
                  observations: "",
                })
              }
              className="flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left hover:border-primary/40 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Package className="size-4 text-info" />
                {f.nom}
              </span>
              <span className="text-xs text-muted-foreground">
                {f.contenu.map((c) => `${c.quantite} × ${nomArticle(c.article_id)}`).join(", ")}
              </span>
              <span className="montant mt-1 font-bold text-primary dark:text-info">
                {formatFCFA(f.prix)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Les articles en plus du forfait s’ajoutent depuis le mode « À l’article », au tarif normal.
      </p>
    </div>
  );
}

export function BandeauAbonnement({
  abonnement,
  chargement,
  clientId,
  couvert,
}: {
  abonnement: AbonnementActif | null | undefined;
  chargement: boolean;
  clientId: string | undefined;
  couvert: number;
}) {
  if (!clientId) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Choisissez d’abord le client abonné.
      </p>
    );
  }
  if (chargement) return null;
  if (!abonnement) {
    return (
      <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        Ce client n’a pas d’abonnement actif.{" "}
        <Link to="/clients/$id" params={{ id: clientId }} className="font-medium underline">
          Souscrire un abonnement depuis sa fiche
        </Link>
      </p>
    );
  }
  const quota = abonnement.quota_pieces ?? 0;
  const restant = Math.max(0, quota - abonnement.consomme_pieces);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
      <Repeat className="mt-0.5 size-4 shrink-0 text-success" />
      <div>
        <p className="font-semibold">
          {abonnement.formules_abonnement_client?.nom ?? "Abonnement"} · {restant} pièce
          {restant > 1 ? "s" : ""} restante
          {restant > 1 ? "s" : ""} sur {quota}
        </p>
        <p className="text-muted-foreground">
          Valable jusqu’au {formatDate(abonnement.fin)}. Ajoutez les articles : {couvert} pièce
          {couvert > 1 ? "s" : ""} incluse
          {couvert > 1 ? "s" : ""}, le reste au tarif normal.
        </p>
      </div>
    </div>
  );
}
