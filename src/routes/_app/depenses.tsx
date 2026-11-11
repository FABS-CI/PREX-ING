import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Loader2, Paperclip, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { SaisieMontant } from "@/components/common/SaisieMontant";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEspace } from "@/contexts/SessionContext";
import { useSessionOuverte } from "@/hooks/useCaisse";
import {
  CATEGORIES_DEPENSE,
  libelleCategorie,
  lienJustificatif,
  useAjouterDepense,
  useDepenses,
  useFournisseurs,
} from "@/hooks/useGestion";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatFCFA, toISODate } from "@/lib/format";
import { periode, type CodePeriode } from "@/lib/periode";
import { LIBELLES_MOYEN, type MoyenPaiement } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — PREX’ING" }] }),
  component: DepensesPage,
});

function DialogueDepense({ onFermer }: { onFermer: () => void }) {
  const { pressing, boutique } = useEspace();
  const caisse = useSessionOuverte(boutique.id);
  const { data: fournisseurs = [] } = useFournisseurs(pressing.id);
  const ajouter = useAjouterDepense();
  const [categorie, setCategorie] = useState("produits");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState(0);
  const [date, setDate] = useState(toISODate(new Date()));
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [fournisseur, setFournisseur] = useState("aucun");
  const [photo, setPhoto] = useState<File | null>(null);
  const valide = montant > 0 && Boolean(date);

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle dépense</DialogTitle>
          <DialogDescription>{boutique.nom}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Catégorie">
            {CATEGORIES_DEPENSE.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={categorie === c.id}
                onClick={() => setCategorie(c.id)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-medium",
                  categorie === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card",
                )}
              >
                {c.libelle}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Champ id="dp-montant" libelle="Montant">
              <SaisieMontant id="dp-montant" valeur={montant} onChange={setMontant} autoFocus />
            </Champ>
            <Champ id="dp-date" libelle="Date">
              <Input
                id="dp-date"
                type="date"
                value={date}
                max={toISODate(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </Champ>
          </div>
          <Champ id="dp-libelle" libelle="Détail (facultatif)">
            <Input
              id="dp-libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. 2 bidons de lessive"
              className="h-11"
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
                  "h-9 rounded-lg border px-3 text-sm font-medium",
                  moyen === m ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {LIBELLES_MOYEN[m]}
              </button>
            ))}
          </div>
          {moyen === "especes" ? (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-xs",
                caisse.data ? "bg-info/10 text-foreground" : "bg-warning/10",
              )}
            >
              {caisse.data
                ? "Payée en espèces : la somme sortira automatiquement de la caisse ouverte."
                : "La caisse n’est pas ouverte : cette dépense ne sera rattachée à aucune session de caisse."}
            </p>
          ) : null}
          {fournisseurs.length > 0 ? (
            <Champ id="dp-fournisseur" libelle="Fournisseur">
              <Select value={fournisseur} onValueChange={setFournisseur}>
                <SelectTrigger id="dp-fournisseur" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          ) : null}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-muted/50">
            <Camera className="size-5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {photo ? photo.name : "Photo du reçu (facultatif)"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={!valide || ajouter.isPending}
            onClick={() =>
              ajouter
                .mutateAsync({
                  pressingId: pressing.id,
                  boutiqueId: boutique.id,
                  categorie,
                  libelle,
                  montant,
                  date,
                  moyen,
                  fournisseurId: fournisseur === "aucun" ? null : fournisseur,
                  photo,
                })
                .then((r) => {
                  if (r.avertissement) toast.warning(r.avertissement);
                  else toast.success(`Dépense de ${formatFCFA(montant)} enregistrée.`);
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            {ajouter.isPending ? <Loader2 className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PERIODES: { id: CodePeriode; libelle: string }[] = [
  { id: "jour", libelle: "Aujourd’hui" },
  { id: "semaine", libelle: "Cette semaine" },
  { id: "mois", libelle: "Ce mois-ci" },
  { id: "mois_precedent", libelle: "Mois dernier" },
];

function DepensesPage() {
  const { boutique } = useEspace();
  const [code, setCode] = useState<CodePeriode>("mois");
  const [nouvelle, setNouvelle] = useState(false);
  const { data, isLoading, error } = useDepenses(boutique.id, periode(code));
  const total = (data ?? []).reduce((a, d) => a + d.montant, 0);

  return (
    <>
      <PageHeader
        titre="Dépenses"
        description={
          data
            ? `${data.length} dépense${data.length > 1 ? "s" : ""} · ${formatFCFA(total)}`
            : boutique.nom
        }
        actions={
          <Button className="h-10" onClick={() => setNouvelle(true)}>
            <Plus />
            Nouvelle dépense
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PERIODES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setCode(p.id)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-medium",
              code === p.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p.libelle}
          </button>
        ))}
      </div>
      {isLoading ? <Chargement /> : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {messageErreur(error)}
        </p>
      ) : null}
      {data && data.length === 0 ? (
        <EtatVide icone={Receipt} titre="Aucune dépense sur la période" />
      ) : null}
      {data && data.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {libelleCategorie(d.categorie)}
                  {d.libelle ? (
                    <span className="font-normal text-muted-foreground"> · {d.libelle}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(d.date)} · {LIBELLES_MOYEN[d.moyen]}
                  {d.fournisseurs ? ` · ${d.fournisseurs.nom}` : ""}
                  {d.profiles?.nom ? ` · ${d.profiles.nom}` : ""}
                  {d.session_caisse_id ? " · sortie de caisse" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {d.justificatif_url ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void lienJustificatif(d.justificatif_url!).then((u) =>
                        u ? window.open(u, "_blank") : toast.error("Justificatif introuvable."),
                      )
                    }
                  >
                    <Paperclip />
                    Reçu
                  </Button>
                ) : null}
                <span className="montant font-semibold">{formatFCFA(d.montant)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {nouvelle ? <DialogueDepense onFermer={() => setNouvelle(false)} /> : null}
    </>
  );
}
