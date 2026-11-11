import { useState } from "react";
import { Loader2, MessageSquareText, Minus, Plus, ShoppingBasket, Trash2, Zap } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  depassePlafond,
  poidsFacture,
  repartirAbonnement,
  libelleLigne,
  montantRemise,
  nombrePieces,
  OBSERVATIONS_RAPIDES,
  prixUnitaire,
  sousTotal,
  totalLigne,
  type LignePanier,
  type TypeRemise,
} from "@/lib/comptoir";
import { formatFCFA, toISODate } from "@/lib/format";
import { LIBELLES_MOYEN, type MoyenPaiement } from "@/lib/types";
import { cn } from "@/lib/utils";

export const MOYENS_COMPTOIR: MoyenPaiement[] = [
  "especes",
  "wave",
  "orange_money",
  "mtn_momo",
  "moov_money",
];

export interface EtatPaiement {
  express: boolean;
  typeRemise: TypeRemise;
  valeurRemise: number;
  avance: number;
  moyen: MoyenPaiement;
  reference: string;
  dateRetrait: Date;
  emplacement: string;
}

interface Props {
  lignes: LignePanier[];
  etat: EtatPaiement;
  onEtat: (patch: Partial<EtatPaiement>) => void;
  onQuantite: (cle: string, delta: number) => void;
  onSupprimer: (cle: string) => void;
  onObservations: (cle: string, texte: string) => void;
  onVider: () => void;
  plafondRemise: number | null;
  peutValider: boolean;
  enCours: boolean;
  onValider: () => void;
  messageBlocage: string | null;
  /** Pièces que l’abonnement du client couvrira (mode abonnement). */
  couvert?: number;
}

function Entier({
  id,
  valeur,
  onChange,
  suffixe,
  className,
}: {
  id: string;
  valeur: number;
  onChange: (n: number) => void;
  suffixe?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        inputMode="numeric"
        value={valeur ? formatFCFA(valeur, false) : ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        onFocus={(e) => e.target.select()}
        className={cn("montant h-11 text-right text-base", suffixe && "pr-14")}
      />
      {suffixe ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {suffixe}
        </span>
      ) : null}
    </div>
  );
}

function DialogueObservations({
  ligne,
  onFermer,
  onEnregistrer,
}: {
  ligne: LignePanier | null;
  onFermer: () => void;
  onEnregistrer: (texte: string) => void;
}) {
  const [texte, setTexte] = useState(ligne?.observations ?? "");
  if (!ligne) return null;
  const ajouter = (mot: string) =>
    setTexte((t) => (t.trim() ? `${t.trim()}, ${mot.toLowerCase()}` : mot));
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observations</DialogTitle>
          <DialogDescription>
            {libelleLigne(ligne)} — couleur, marque, état constaté à l’arrivée.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {OBSERVATIONS_RAPIDES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => ajouter(m)}
              className="h-9 rounded-full border px-3 text-sm hover:border-primary/50 hover:bg-muted"
            >
              {m}
            </button>
          ))}
        </div>
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={3}
          placeholder="Ex. bleu marine, tache d’huile sur la manche"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={() => onEnregistrer(texte)}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Panier({
  lignes,
  etat,
  onEtat,
  onQuantite,
  onSupprimer,
  onObservations,
  onVider,
  plafondRemise,
  peutValider,
  enCours,
  onValider,
  messageBlocage,
  couvert = 0,
}: Props) {
  const [obs, setObs] = useState<string | null>(null);
  const lignesCalcul = couvert > 0 ? repartirAbonnement(lignes, couvert) : lignes;
  const st = sousTotal(lignesCalcul, etat.express);
  const valeurIncluse = sousTotal(lignes, etat.express) - st;
  const remise = montantRemise(st, etat.typeRemise, etat.valeurRemise);
  const net = st - remise;
  const avance = Math.min(etat.avance, net);
  const reste = net - avance;
  const tropDeRemise = depassePlafond(st, remise, plafondRemise);
  const pieces = nombrePieces(lignes);
  const mobileMoney = etat.moyen !== "especes";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingBasket className="size-4" />
          Panier
          {pieces > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">
              · {pieces} pièce{pieces > 1 ? "s" : ""}
            </span>
          ) : null}
        </h2>
        {lignes.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={onVider} className="text-muted-foreground">
            Vider
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {lignes.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Touchez un article pour l’ajouter.
          </p>
        ) : (
          <ul className="divide-y">
            {lignes.map((l) => (
              <li key={l.cle} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.articleNom}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.type === "kilo" ? (
                        <>
                          {l.serviceNom} · {String(poidsFacture(l)).replace(".", ",")} kg facturés
                          {(l.poidsKg ?? 0) < (l.poidsMinKg ?? 0) ? " (minimum)" : ""} ·{" "}
                          <span className="montant">
                            {formatFCFA(prixUnitaire(l, etat.express))}/kg
                          </span>
                        </>
                      ) : l.type === "lot" ? (
                        <>Forfait · {l.quantite} pièces</>
                      ) : (
                        <>
                          {l.serviceNom} ·{" "}
                          <span className="montant">
                            {formatFCFA(prixUnitaire(l, etat.express))}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <p className="montant text-sm font-semibold">
                    {formatFCFA(totalLigne(l, etat.express))}
                  </p>
                </div>
                {l.observations ? (
                  <p className="mt-1 text-xs text-warning">{l.observations}</p>
                ) : null}
                <div className="mt-2 flex items-center gap-1">
                  {l.type === "kilo" || l.type === "lot" ? (
                    <span className="text-xs text-muted-foreground">
                      {l.quantite} pièce{l.quantite > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={() => onQuantite(l.cle, -1)}
                        aria-label="Retirer une pièce"
                      >
                        <Minus />
                      </Button>
                      <span className="montant w-9 text-center font-semibold">{l.quantite}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9"
                        onClick={() => onQuantite(l.cle, 1)}
                        aria-label="Ajouter une pièce"
                      >
                        <Plus />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-9"
                    onClick={() => setObs(l.cle)}
                  >
                    <MessageSquareText />
                    <span className="hidden sm:inline">Observations</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground"
                    onClick={() => onSupprimer(l.cle)}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t bg-muted/30 px-4 py-3">
        <label className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Zap className="size-4 text-warning" />
            Express
          </span>
          <Switch checked={etat.express} onCheckedChange={(v) => onEtat({ express: v })} />
        </label>

        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="remise" className="text-xs">
              Remise{plafondRemise !== null ? ` (max ${plafondRemise} %)` : ""}
            </Label>
            <Entier
              id="remise"
              valeur={etat.valeurRemise}
              onChange={(n) => onEtat({ valeurRemise: n })}
            />
          </div>
          <div className="flex h-11 overflow-hidden rounded-md border">
            {(["montant", "pct"] as TypeRemise[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onEtat({ typeRemise: t })}
                className={cn(
                  "px-3 text-sm font-medium",
                  etat.typeRemise === t ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {t === "montant" ? "FCFA" : "%"}
              </button>
            ))}
          </div>
        </div>
        {tropDeRemise ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            role="alert"
          >
            Remise supérieure à votre plafond ({plafondRemise} %), validation d’un gérant
            nécessaire.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="avance" className="text-xs">
              Avance versée
            </Label>
            <Entier id="avance" valeur={etat.avance} onChange={(n) => onEtat({ avance: n })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="retrait" className="text-xs">
              Retrait prévu
            </Label>
            <Input
              id="retrait"
              type="date"
              value={toISODate(etat.dateRetrait)}
              min={toISODate(new Date())}
              onChange={(e) => {
                const [a, m, j] = e.target.value.split("-").map(Number);
                if (a && m && j) onEtat({ dateRetrait: new Date(a, m - 1, j) });
              }}
              className="h-11"
            />
          </div>
        </div>

        {etat.avance > 0 ? (
          <>
            <div
              className="flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label="Moyen de paiement"
            >
              {MOYENS_COMPTOIR.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={etat.moyen === m}
                  onClick={() => onEtat({ moyen: m })}
                  className={cn(
                    "h-9 rounded-lg border px-3 text-sm font-medium",
                    etat.moyen === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card",
                  )}
                >
                  {LIBELLES_MOYEN[m]}
                </button>
              ))}
            </div>
            {mobileMoney ? (
              <div className="space-y-1">
                <Label htmlFor="ref" className="text-xs">
                  Référence de transaction (obligatoire)
                </Label>
                <Input
                  id="ref"
                  value={etat.reference}
                  onChange={(e) => onEtat({ reference: e.target.value })}
                  placeholder="Ex. MP261111.1432.A12345"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Le paiement sera marqué « à vérifier » jusqu’au rapprochement.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="emplacement" className="text-xs">
            Emplacement (étagère / casier)
          </Label>
          <Input
            id="emplacement"
            value={etat.emplacement}
            onChange={(e) => onEtat({ emplacement: e.target.value })}
            className="h-10"
            placeholder="Facultatif"
          />
        </div>

        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sous-total</dt>
            <dd className="montant">{formatFCFA(st + valeurIncluse)}</dd>
          </div>
          {valeurIncluse > 0 ? (
            <div className="flex justify-between text-success">
              <dt>
                {couvert} pièce{couvert > 1 ? "s" : ""} incluse{couvert > 1 ? "s" : ""} (abonnement)
              </dt>
              <dd className="montant">−{formatFCFA(valeurIncluse)}</dd>
            </div>
          ) : null}
          {remise > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Remise</dt>
              <dd className="montant">−{formatFCFA(remise)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-bold">
            <dt>Net à payer</dt>
            <dd className="montant">{formatFCFA(net)}</dd>
          </div>
          {avance > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Avance</dt>
              <dd className="montant">−{formatFCFA(avance)}</dd>
            </div>
          ) : null}
          <div
            className={cn(
              "flex justify-between font-semibold",
              reste > 0 ? "text-destructive" : "text-success",
            )}
          >
            <dt>Reste à payer</dt>
            <dd className="montant">{formatFCFA(reste)}</dd>
          </div>
        </dl>

        {messageBlocage ? <p className="text-xs text-muted-foreground">{messageBlocage}</p> : null}
        <Button
          className="h-14 w-full text-base font-semibold"
          disabled={!peutValider || enCours || tropDeRemise}
          onClick={onValider}
        >
          {enCours ? <Loader2 className="animate-spin" /> : null}
          Valider le dépôt (F9)
        </Button>
      </div>

      <DialogueObservations
        key={obs ?? "aucune"}
        ligne={lignes.find((l) => l.cle === obs) ?? null}
        onFermer={() => setObs(null)}
        onEnregistrer={(t) => {
          if (obs) onObservations(obs, t);
          setObs(null);
        }}
      />
    </div>
  );
}
