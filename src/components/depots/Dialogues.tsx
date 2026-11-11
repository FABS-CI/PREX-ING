import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { MOYENS_COMPTOIR } from "@/components/comptoir/Panier";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAnnulerDepot, useEncaisser, useRetrait, type DepotDetail } from "@/hooks/useDepots";
import { messageErreur } from "@/lib/erreurs";
import { formatFCFA } from "@/lib/format";
import { LIBELLES_MOYEN, type MoyenPaiement } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Base {
  ouvert: boolean;
  onFermer: () => void;
  detail: DepotDetail;
}

export function DialogueEncaisser({
  ouvert,
  onFermer,
  detail,
  onFait,
}: Base & { onFait?: () => void }) {
  const d = detail.depot;
  const [montant, setMontant] = useState(d.reste_a_payer);
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [reference, setReference] = useState("");
  const encaisser = useEncaisser();
  const mobile = moyen !== "especes";
  const erreur =
    montant <= 0
      ? "Indiquez un montant."
      : montant > d.reste_a_payer
        ? `Le montant ne peut pas dépasser le reste à payer (${formatFCFA(d.reste_a_payer)}).`
        : mobile && !reference.trim()
          ? "Saisissez la référence de la transaction."
          : null;

  async function valider() {
    if (erreur) return;
    try {
      await encaisser.mutateAsync({ depot: d, montant, moyen, reference });
      toast.success(
        mobile
          ? `${formatFCFA(montant)} en ${LIBELLES_MOYEN[moyen]} enregistré, à vérifier.`
          : `${formatFCFA(montant)} encaissé.`,
      );
      onFermer();
      onFait?.();
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encaisser — {d.numero}</DialogTitle>
          <DialogDescription>Reste à payer : {formatFCFA(d.reste_a_payer)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Champ id="enc-montant" libelle="Montant">
            <Input
              id="enc-montant"
              inputMode="numeric"
              value={montant ? formatFCFA(montant, false) : ""}
              onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, "")) || 0)}
              onFocus={(e) => e.target.select()}
              className="montant h-12 text-right text-lg"
              autoFocus
            />
          </Champ>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Moyen de paiement">
            {MOYENS_COMPTOIR.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={moyen === m}
                onClick={() => setMoyen(m)}
                className={cn(
                  "h-10 rounded-lg border px-3 text-sm font-medium",
                  moyen === m ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {LIBELLES_MOYEN[m]}
              </button>
            ))}
          </div>
          {mobile ? (
            <Champ
              id="enc-ref"
              libelle="Référence de transaction"
              aide="Le paiement restera « à vérifier » jusqu’au rapprochement."
            >
              <Input
                id="enc-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-11"
              />
            </Champ>
          ) : null}
          {erreur && montant > 0 ? <p className="text-sm text-destructive">{erreur}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={() => void valider()} disabled={Boolean(erreur) || encaisser.isPending}>
            {encaisser.isPending ? <Loader2 className="animate-spin" /> : null}
            Encaisser {montant > 0 ? formatFCFA(montant) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogueRetrait({
  ouvert,
  onFermer,
  detail,
  peutForcer,
  onEncaisser,
}: Base & { peutForcer: boolean; onEncaisser: () => void }) {
  const restantes = detail.lignes.filter((l) => l.statut !== "retire");
  const [choisies, setChoisies] = useState<Set<string>>(() => new Set(restantes.map((l) => l.id)));
  const [forcer, setForcer] = useState(false);
  const retrait = useRetrait();
  const d = detail.depot;
  const toutes = restantes.length > 0 && restantes.every((l) => choisies.has(l.id));
  const solde = d.reste_a_payer > 0;
  const bloque = toutes && solde && !forcer;

  async function valider() {
    if (choisies.size === 0 || bloque) return;
    try {
      await retrait.mutateAsync({ depotId: d.id, ligneIds: [...choisies], toutes });
      toast.success(toutes ? `Dépôt ${d.numero} remis au client.` : "Retrait partiel enregistré.");
      onFermer();
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remettre au client</DialogTitle>
          <DialogDescription>Cochez les pièces remises maintenant.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
          {restantes.map((l) => (
            <li key={l.id}>
              <label className="flex items-center gap-3 px-3 py-2.5">
                <Checkbox
                  checked={choisies.has(l.id)}
                  onCheckedChange={(c) =>
                    setChoisies((s) => {
                      const n = new Set(s);
                      if (c === true) n.add(l.id);
                      else n.delete(l.id);
                      return n;
                    })
                  }
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-medium">
                    {l.quantite} × {l.libelle}
                  </span>
                  {l.etiquette ? (
                    <span className="block text-xs text-muted-foreground">{l.etiquette}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {toutes && solde ? (
          <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium">Il reste {formatFCFA(d.reste_a_payer)} à payer.</p>
            <Button className="w-full" onClick={onEncaisser}>
              Encaisser le solde
            </Button>
            {peutForcer ? (
              <label className="flex items-center gap-2 pt-1">
                <Checkbox checked={forcer} onCheckedChange={(c) => setForcer(c === true)} />
                Remettre quand même (le dépôt reste impayé)
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                Seul un gérant ou le propriétaire peut remettre un dépôt impayé.
              </p>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            onClick={() => void valider()}
            disabled={choisies.size === 0 || bloque || retrait.isPending}
          >
            {retrait.isPending ? <Loader2 className="animate-spin" /> : null}
            {toutes
              ? "Remettre le dépôt"
              : `Remettre ${choisies.size} ligne${choisies.size > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogueAnnuler({ ouvert, onFermer, detail }: Base) {
  const [motif, setMotif] = useState("");
  const annuler = useAnnulerDepot();
  const paiementsValides = detail.paiements.filter((p) => p.statut === "valide").length;

  async function valider() {
    if (motif.trim().length < 3 || paiementsValides) return;
    try {
      await annuler.mutateAsync({ id: detail.depot.id, motif });
      toast.success(`Dépôt ${detail.depot.numero} annulé.`);
      onFermer();
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler le dépôt {detail.depot.numero}</DialogTitle>
          <DialogDescription>L’annulation est tracée avec votre nom et le motif.</DialogDescription>
        </DialogHeader>
        {paiementsValides ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Ce dépôt a {paiementsValides} paiement{paiementsValides > 1 ? "s" : ""} validé
            {paiementsValides > 1 ? "s" : ""}. Annulez d’abord les paiements.
          </p>
        ) : (
          <Champ id="motif" libelle="Motif (obligatoire)">
            <Textarea
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              autoFocus
            />
          </Champ>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Retour
          </Button>
          <Button
            variant="destructive"
            onClick={() => void valider()}
            disabled={Boolean(paiementsValides) || motif.trim().length < 3 || annuler.isPending}
          >
            {annuler.isPending ? <Loader2 className="animate-spin" /> : null}
            Annuler le dépôt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
