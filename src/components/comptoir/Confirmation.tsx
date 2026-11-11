import { CheckCircle2, MessageCircle, Plus, Printer, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DepotCree } from "@/hooks/useCreerDepot";
import { formatDate, formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  depot: DepotCree;
  clientNom: string;
  lienWhatsApp: string | null;
  onImprimer: (quoi: "ticket" | "etiquettes") => void;
  onNouveau: () => void;
}

export function Confirmation({ depot, clientNom, lienWhatsApp, onImprimer, onNouveau }: Props) {
  const d = depot.depot;
  return (
    <div className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col items-center bg-success/10 px-6 py-8 text-center">
          <CheckCircle2 className="mb-2 size-10 text-success" />
          <p className="text-sm text-muted-foreground">Dépôt enregistré pour {clientNom}</p>
          <p className="montant mt-1 text-4xl font-extrabold tracking-tight">{d.numero}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {depot.etiquettes.length} pièce{depot.etiquettes.length > 1 ? "s" : ""} · retrait le{" "}
            {formatDate(d.date_retrait_prevue)}
            {d.express ? " · express" : ""}
          </p>
        </div>
        <dl className="grid grid-cols-3 divide-x border-t text-center">
          <div className="px-3 py-4">
            <dt className="text-xs text-muted-foreground">Net à payer</dt>
            <dd className="montant mt-0.5 font-bold">{formatFCFA(d.net_a_payer)}</dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-muted-foreground">Déjà payé</dt>
            <dd className="montant mt-0.5 font-bold">{formatFCFA(d.deja_paye)}</dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-muted-foreground">Reste à payer</dt>
            <dd
              className={cn(
                "montant mt-0.5 font-bold",
                d.reste_a_payer > 0 ? "text-destructive" : "text-success",
              )}
            >
              {formatFCFA(d.reste_a_payer)}
            </dd>
          </div>
        </dl>
        {depot.paiement?.statut === "a_verifier" ? (
          <p className="border-t bg-warning/10 px-4 py-2.5 text-center text-sm text-warning">
            Paiement mobile money de {formatFCFA(depot.paiement.montant)} à vérifier : il sera
            compté une fois validé.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" className="h-14 text-base" onClick={() => onImprimer("ticket")}>
          <Printer />
          Imprimer le ticket
        </Button>
        <Button
          variant="outline"
          className="h-14 text-base"
          onClick={() => onImprimer("etiquettes")}
        >
          <Tag />
          Imprimer les étiquettes
        </Button>
        {lienWhatsApp ? (
          <Button asChild variant="outline" className="h-14 text-base sm:col-span-2">
            <a href={lienWhatsApp} target="_blank" rel="noreferrer">
              <MessageCircle />
              Envoyer le reçu par WhatsApp
            </a>
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground sm:col-span-2">
            Pas d’envoi WhatsApp : le client n’a pas donné son accord pour recevoir des messages.
          </p>
        )}
        <Button className="h-14 text-base sm:col-span-2" onClick={onNouveau} autoFocus>
          <Plus />
          Nouveau dépôt
        </Button>
      </div>
    </div>
  );
}
