import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, ClipboardCheck, Loader2, Minus, Plus, Truck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { SaisieMontant } from "@/components/common/SaisieMontant";
import { lirePoids } from "@/components/comptoir/PanneauxModes";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import {
  aReapprovisionner,
  ecartInventaire,
  useAjouterFournisseur,
  useAjouterProduit,
  useFournisseurs,
  useMouvementStock,
  useMouvementsStock,
  useProduits,
  type Produit,
} from "@/hooks/useGestion";
import { messageErreur } from "@/lib/erreurs";
import { formatDateHeure, formatFCFA, formatTelephone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/stock")({
  head: () => ({ meta: [{ title: "Stock — PREX’ING" }] }),
  component: StockPage,
});

const nombre = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function DialogueProduit({ onFermer }: { onFermer: () => void }) {
  const { pressing, boutique } = useEspace();
  const ajouter = useAjouterProduit();
  const [nom, setNom] = useState("");
  const [unite, setUnite] = useState("unité");
  const [seuil, setSeuil] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
          <DialogDescription>
            Lessive, solvant, cintres, housses, papier thermique…
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Champ id="pr-nom" libelle="Nom">
            <Input
              id="pr-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="h-11"
              autoFocus
            />
          </Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ id="pr-unite" libelle="Unité">
              <Input
                id="pr-unite"
                value={unite}
                onChange={(e) => setUnite(e.target.value)}
                placeholder="litre, kg, carton…"
                className="h-11"
              />
            </Champ>
            <Champ id="pr-seuil" libelle="Seuil d’alerte">
              <Input
                id="pr-seuil"
                inputMode="decimal"
                value={seuil}
                onChange={(e) => setSeuil(e.target.value)}
                placeholder="5"
                className="h-11 text-right"
              />
            </Champ>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={nom.trim().length < 2 || ajouter.isPending}
            onClick={() =>
              ajouter
                .mutateAsync({
                  pressingId: pressing.id,
                  boutiqueId: boutique.id,
                  nom,
                  unite,
                  seuil: lirePoids(seuil),
                })
                .then(() => {
                  toast.success(`Produit « ${nom.trim()} » ajouté.`);
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Action = "entree" | "sortie" | "inventaire";

function DialogueMouvement({
  produit,
  action,
  onFermer,
}: {
  produit: Produit;
  action: Action;
  onFermer: () => void;
}) {
  const { pressing, boutique } = useEspace();
  const { data: fournisseurs = [] } = useFournisseurs(pressing.id);
  const mouvement = useMouvementStock();
  const [quantite, setQuantite] = useState("");
  const [cout, setCout] = useState(0);
  const [fournisseur, setFournisseur] = useState("aucun");
  const [note, setNote] = useState("");
  const q = lirePoids(quantite);
  const inventaire = action === "inventaire" ? ecartInventaire(produit.quantite, q) : null;
  const titres: Record<Action, string> = {
    entree: "Entrée en stock (achat)",
    sortie: "Sortie (consommation)",
    inventaire: "Inventaire",
  };
  const valide =
    action === "inventaire"
      ? quantite.trim() !== ""
      : q > 0 && (action !== "sortie" || q <= produit.quantite);

  function valider() {
    const m =
      action === "inventaire"
        ? inventaire && {
            type: inventaire.type,
            quantite: inventaire.quantite,
            note: `Inventaire : ${nombre(q)} ${produit.unite} comptés`,
          }
        : { type: action, quantite: q, note };
    if (!m) {
      toast.success("Inventaire conforme, rien à corriger.");
      onFermer();
      return;
    }
    mouvement
      .mutateAsync({
        pressingId: pressing.id,
        boutiqueId: boutique.id,
        produitId: produit.id,
        type: m.type,
        quantite: m.quantite,
        coutUnitaire: action === "entree" && cout ? cout : null,
        fournisseurId: action === "entree" && fournisseur !== "aucun" ? fournisseur : null,
        note: m.note,
      })
      .then(() => {
        toast.success("Stock mis à jour.");
        onFermer();
      })
      .catch((e: unknown) => toast.error(messageErreur(e)));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titres[action]}</DialogTitle>
          <DialogDescription>
            {produit.nom} · en stock : {nombre(produit.quantite)} {produit.unite}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Champ
            id="mv-q"
            libelle={
              action === "inventaire"
                ? `Quantité comptée (${produit.unite})`
                : `Quantité (${produit.unite})`
            }
          >
            <Input
              id="mv-q"
              inputMode="decimal"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="h-12 text-right text-lg"
              autoFocus
            />
          </Champ>
          {action === "inventaire" && quantite.trim() !== "" ? (
            <p className="text-sm">
              {inventaire
                ? `Écart : ${inventaire.type === "entree" ? "+" : "−"}${nombre(inventaire.quantite)} ${produit.unite}, corrigé automatiquement.`
                : "Aucun écart."}
            </p>
          ) : null}
          {action === "sortie" && q > produit.quantite ? (
            <p className="text-sm text-destructive">Plus que la quantité en stock.</p>
          ) : null}
          {action === "entree" ? (
            <>
              <Champ id="mv-cout" libelle="Coût unitaire (facultatif)">
                <SaisieMontant id="mv-cout" valeur={cout} onChange={setCout} />
              </Champ>
              {fournisseurs.length ? (
                <Champ id="mv-f" libelle="Fournisseur">
                  <Select value={fournisseur} onValueChange={setFournisseur}>
                    <SelectTrigger id="mv-f" className="h-11">
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
              {cout && q ? (
                <p className="text-xs text-muted-foreground">
                  Total de l’achat : {formatFCFA(Math.round(cout * q))}. Pensez à l’enregistrer
                  aussi dans Dépenses s’il a été payé.
                </p>
              ) : null}
            </>
          ) : null}
          {action !== "inventaire" ? (
            <Champ id="mv-note" libelle="Note (facultatif)">
              <Input
                id="mv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-11"
              />
            </Champ>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button disabled={!valide || mouvement.isPending} onClick={valider}>
            {mouvement.isPending ? <Loader2 className="animate-spin" /> : null}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fournisseurs() {
  const { pressing, role } = useEspace();
  const { data = [], isLoading } = useFournisseurs(pressing.id);
  const ajouter = useAjouterFournisseur(pressing.id);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [notes, setNotes] = useState("");
  const gestion = role === "proprietaire" || role === "gerant";
  return (
    <div className="space-y-4">
      {gestion ? (
        <div className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
          <Champ id="fo-nom" libelle="Nom">
            <Input
              id="fo-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="h-10"
            />
          </Champ>
          <Champ id="fo-tel" libelle="Téléphone">
            <Input
              id="fo-tel"
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="h-10"
            />
          </Champ>
          <Champ id="fo-notes" libelle="Produits fournis">
            <Input
              id="fo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10"
            />
          </Champ>
          <Button
            className="h-10"
            disabled={nom.trim().length < 2 || ajouter.isPending}
            onClick={() =>
              ajouter
                .mutateAsync({ nom, telephone: tel, notes })
                .then(() => {
                  toast.success("Fournisseur ajouté.");
                  setNom("");
                  setTel("");
                  setNotes("");
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            <Plus />
            Ajouter
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <Chargement />
      ) : data.length === 0 ? (
        <EtatVide icone={Truck} titre="Aucun fournisseur" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">{f.nom}</span>
                {f.notes ? (
                  <span className="block text-xs text-muted-foreground">{f.notes}</span>
                ) : null}
              </span>
              {f.telephone ? (
                <a
                  href={`tel:${f.telephone}`}
                  className="montant text-primary underline dark:text-info"
                >
                  {formatTelephone(f.telephone)}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StockPage() {
  const { boutique } = useEspace();
  const { data: produits, isLoading, error } = useProduits(boutique.id);
  const mouvements = useMouvementsStock(boutique.id);
  const [nouveau, setNouveau] = useState(false);
  const [action, setAction] = useState<{ produit: Produit; action: Action } | null>(null);
  const alertes = (produits ?? []).filter(aReapprovisionner);

  return (
    <>
      <PageHeader
        titre="Stock"
        description={boutique.nom}
        actions={
          <Button className="h-10" onClick={() => setNouveau(true)}>
            <Plus />
            Nouveau produit
          </Button>
        }
      />
      {alertes.length ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <TriangleAlert className="size-4 text-warning" />À réapprovisionner :{" "}
          {alertes.map((p) => p.nom).join(", ")}.
        </p>
      ) : null}
      <Tabs defaultValue="produits">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
        </TabsList>
        <TabsContent value="produits">
          {isLoading ? <Chargement /> : null}
          {error ? (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {messageErreur(error)}
            </p>
          ) : null}
          {produits && produits.length === 0 ? (
            <EtatVide
              icone={Boxes}
              titre="Aucun produit suivi"
              texte="Ajoutez vos consommables : lessive, solvant, cintres, housses, papier thermique…"
            />
          ) : null}
          {produits && produits.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {produits.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{p.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      Seuil d’alerte : {nombre(p.seuil_alerte)} {p.unite}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "montant rounded-lg px-2.5 py-1 text-sm font-semibold",
                        aReapprovisionner(p) ? "bg-warning/15 text-warning" : "bg-muted",
                      )}
                    >
                      {nombre(p.quantite)} {p.unite}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction({ produit: p, action: "entree" })}
                    >
                      <Plus />
                      Entrée
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction({ produit: p, action: "sortie" })}
                    >
                      <Minus />
                      Sortie
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAction({ produit: p, action: "inventaire" })}
                    >
                      <ClipboardCheck />
                      Inventaire
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>
        <TabsContent value="mouvements">
          {mouvements.data?.length === 0 ? (
            <EtatVide icone={Boxes} titre="Aucun mouvement" />
          ) : null}
          {mouvements.data && mouvements.data.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {mouvements.data.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{m.stock_produits?.nom}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateHeure(m.created_at)}
                      {m.fournisseurs ? ` · ${m.fournisseurs.nom}` : ""}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "montant font-semibold",
                      m.type === "entree" ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.type === "entree" ? "+" : "−"}
                    {nombre(m.quantite)} {m.stock_produits?.unite}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>
        <TabsContent value="fournisseurs">
          <Fournisseurs />
        </TabsContent>
      </Tabs>
      {nouveau ? <DialogueProduit onFermer={() => setNouveau(false)} /> : null}
      {action ? (
        <DialogueMouvement
          produit={action.produit}
          action={action.action}
          onFermer={() => setAction(null)}
        />
      ) : null}
    </>
  );
}
