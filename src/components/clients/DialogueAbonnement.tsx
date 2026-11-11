import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MOYENS_COMPTOIR } from "@/components/comptoir/Panier";
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
import { Label } from "@/components/ui/label";
import { useEspace } from "@/contexts/SessionContext";
import { useFormules, useSouscrire } from "@/hooks/useModesAvances";
import { messageErreur } from "@/lib/erreurs";
import { ajouterJours, formatDate, formatFCFA } from "@/lib/format";
import { LIBELLES_MOYEN, type MoyenPaiement } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DialogueAbonnement({
  clientId,
  clientNom,
  onFermer,
}: {
  clientId: string;
  clientNom: string;
  onFermer: () => void;
}) {
  const { pressing, boutique } = useEspace();
  const { data: formules = [] } = useFormules(pressing.id);
  const actives = formules.filter((f) => f.actif && f.quota_pieces);
  const [formuleId, setFormuleId] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [reference, setReference] = useState("");
  const souscrire = useSouscrire();
  const formule = actives.find((f) => f.id === formuleId);
  const valide = Boolean(formule) && (moyen === "especes" || reference.trim().length > 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonnement pour {clientNom}</DialogTitle>
          <DialogDescription>
            Le client paie maintenant ; ses pièces sont ensuite décomptées au comptoir.
          </DialogDescription>
        </DialogHeader>
        {actives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune formule. Créez-en une dans{" "}
            <Link to="/catalogue" className="font-medium underline">
              Catalogue & tarifs → Abonnements
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              {actives.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormuleId(f.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-left",
                    f.id === formuleId
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-primary/40",
                  )}
                >
                  <span>
                    <span className="block font-medium">{f.nom}</span>
                    <span className="block text-xs text-muted-foreground">
                      {f.quota_pieces} pièces · {f.duree_jours} jours, jusqu’au{" "}
                      {formatDate(ajouterJours(new Date(), f.duree_jours))}
                    </span>
                  </span>
                  <span className="montant font-semibold">{formatFCFA(f.prix)}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOYENS_COMPTOIR.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoyen(m)}
                  className={cn(
                    "h-9 rounded-lg border px-3 text-sm font-medium",
                    moyen === m ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {LIBELLES_MOYEN[m]}
                </button>
              ))}
            </div>
            {moyen !== "especes" ? (
              <div className="space-y-1.5">
                <Label htmlFor="abo-ref">Référence de transaction</Label>
                <Input
                  id="abo-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-11"
                />
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={!valide || souscrire.isPending}
            onClick={() => {
              if (!formule) return;
              souscrire
                .mutateAsync({
                  pressingId: pressing.id,
                  boutiqueId: boutique.id,
                  clientId,
                  formule,
                  moyen,
                  reference,
                })
                .then(() => {
                  toast.success(`Abonnement « ${formule.nom} » activé pour ${clientNom}.`);
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)));
            }}
          >
            {souscrire.isPending ? <Loader2 className="animate-spin" /> : null}
            Encaisser {formule ? formatFCFA(formule.prix) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
