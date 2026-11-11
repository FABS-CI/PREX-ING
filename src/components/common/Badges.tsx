import { cn } from "@/lib/utils";
import {
  LIBELLES_STATUT_DEPOT,
  LIBELLES_STATUT_PAIEMENT,
  LIBELLES_STATUT_PAIEMENT_LIGNE,
  type StatutDepot,
  type StatutPaiement,
  type StatutPaiementDepot,
} from "@/lib/types";

const base =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const COULEURS_DEPOT: Record<StatutDepot, string> = {
  en_attente: "bg-muted text-muted-foreground",
  recu: "bg-secondary text-secondary-foreground",
  en_traitement: "bg-info/15 text-info",
  pret: "bg-success/15 text-success",
  en_livraison: "bg-warning/15 text-warning",
  retire: "bg-muted text-muted-foreground",
  annule: "bg-destructive/10 text-destructive line-through",
};

export function BadgeStatutDepot({ statut }: { statut: StatutDepot }) {
  return <span className={cn(base, COULEURS_DEPOT[statut])}>{LIBELLES_STATUT_DEPOT[statut]}</span>;
}

const COULEURS_PAIEMENT: Record<StatutPaiementDepot, string> = {
  non_solde: "bg-destructive/10 text-destructive",
  partiel: "bg-warning/15 text-warning",
  solde: "bg-success/15 text-success",
};

export function BadgeStatutPaiement({ statut }: { statut: StatutPaiementDepot }) {
  return (
    <span className={cn(base, COULEURS_PAIEMENT[statut])}>{LIBELLES_STATUT_PAIEMENT[statut]}</span>
  );
}

const COULEURS_LIGNE: Record<StatutPaiement, string> = {
  valide: "bg-success/15 text-success",
  a_verifier: "bg-warning/15 text-warning",
  echoue: "bg-destructive/10 text-destructive",
  annule: "bg-muted text-muted-foreground line-through",
};

export function BadgeStatutPaiementLigne({ statut }: { statut: StatutPaiement }) {
  return (
    <span className={cn(base, COULEURS_LIGNE[statut])}>
      {LIBELLES_STATUT_PAIEMENT_LIGNE[statut]}
    </span>
  );
}
