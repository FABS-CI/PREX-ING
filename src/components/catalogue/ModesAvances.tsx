import { useState } from "react";
import { Loader2, Package, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { lirePoids } from "@/components/comptoir/PanneauxModes";
import { EtatVide } from "@/components/common/EtatVide";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { indexTarifs, type Catalogue } from "@/hooks/useCatalogue";
import {
  useEnregistrerForfait,
  useEnregistrerFormule,
  useEnregistrerPrixKilo,
  useForfaits,
  useFormules,
  usePrixKilo,
  type ContenuForfait,
} from "@/hooks/useModesAvances";
import { messageErreur } from "@/lib/erreurs";
import { formatFCFA } from "@/lib/format";

const entier = (v: string) => Number(v.replace(/\D/g, "")) || 0;

function LignePrixKilo({
  pressingId,
  serviceId,
  nom,
  id,
  prix,
  min,
  modifiable,
}: {
  pressingId: string;
  serviceId: string;
  nom: string;
  id: string | undefined;
  prix: number | null;
  min: number;
  modifiable: boolean;
}) {
  const [p, setP] = useState(prix === null ? "" : String(prix));
  const [m, setM] = useState(String(min).replace(".", ","));
  const enregistrer = useEnregistrerPrixKilo(pressingId);
  const change = p !== (prix === null ? "" : String(prix)) || lirePoids(m) !== min;
  return (
    <tr className="border-t">
      <td className="px-4 py-2 font-medium">{nom}</td>
      <td className="px-2 py-2">
        <Input
          inputMode="numeric"
          value={p}
          placeholder="—"
          disabled={!modifiable}
          onChange={(e) => setP(e.target.value.replace(/\D/g, ""))}
          className="montant h-10 text-right"
          aria-label={`Prix au kg — ${nom}`}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          inputMode="decimal"
          value={m}
          disabled={!modifiable}
          onChange={(e) => setM(e.target.value)}
          className="h-10 text-right"
          aria-label={`Poids minimum — ${nom}`}
        />
      </td>
      <td className="px-2 py-2 text-right">
        {modifiable ? (
          <Button
            size="sm"
            variant="outline"
            disabled={!change || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({
                  id,
                  serviceId,
                  prixKg: p === "" ? null : entier(p),
                  poidsMin: lirePoids(m),
                })
                .then(() =>
                  toast.success(
                    p === "" ? `Prix au kilo retiré : ${nom}` : `Prix au kilo enregistré : ${nom}`,
                  ),
                )
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            Enregistrer
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

export function EditeurPrixKilo({
  pressingId,
  catalogue,
  modifiable,
}: {
  pressingId: string;
  catalogue: Catalogue;
  modifiable: boolean;
}) {
  const { data = [] } = usePrixKilo(pressingId);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-2 py-3 text-right font-medium">Prix au kg (FCFA)</th>
            <th className="px-2 py-3 text-right font-medium">Poids minimum (kg)</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {catalogue.services.map((s) => {
            const t = data.find((x) => x.service_id === s.id && x.boutique_id === null);
            return (
              <LignePrixKilo
                key={`${s.id}-${t?.id ?? ""}-${t?.prix_kg ?? ""}-${t?.poids_min ?? ""}`}
                pressingId={pressingId}
                serviceId={s.id}
                nom={s.nom}
                id={t?.id}
                prix={t?.prix_kg ?? null}
                min={t?.poids_min ?? 0}
                modifiable={modifiable}
              />
            );
          })}
        </tbody>
      </table>
      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
        Le client paie au moins le poids minimum : 4,5 kg pesés avec un minimum de 5 kg sont
        facturés 5 kg.
      </p>
    </div>
  );
}

function DialogueForfait({
  pressingId,
  catalogue,
  onFermer,
}: {
  pressingId: string;
  catalogue: Catalogue;
  onFermer: () => void;
}) {
  const idx = indexTarifs(catalogue.tarifs);
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState(0);
  const [contenu, setContenu] = useState<ContenuForfait[]>([
    {
      article_id: catalogue.articles[0]?.id ?? "",
      service_id: catalogue.services[0]?.id ?? "",
      quantite: 10,
    },
  ]);
  const enregistrer = useEnregistrerForfait(pressingId);
  const valeurNormale = contenu.reduce(
    (a, c) => a + (idx.commun(c.article_id, c.service_id)?.prix ?? 0) * c.quantite,
    0,
  );
  const maj = (i: number, patch: Partial<ContenuForfait>) =>
    setContenu((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const valide =
    nom.trim().length >= 2 &&
    prix > 0 &&
    contenu.every((c) => c.article_id && c.service_id && c.quantite > 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouveau forfait</DialogTitle>
          <DialogDescription>
            Un lot vendu à prix fixe, par exemple « 10 chemises = 8 000 FCFA ».
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="f-nom">Nom</Label>
            <Input
              id="f-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="10 chemises"
              className="h-11"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Contenu</Label>
            {contenu.map((c, i) => (
              <div key={i} className="grid grid-cols-[64px_1fr_1fr_auto] gap-2">
                <Input
                  inputMode="numeric"
                  value={String(c.quantite)}
                  onChange={(e) => maj(i, { quantite: entier(e.target.value) })}
                  className="h-10 text-right"
                  aria-label="Quantité"
                />
                <Select value={c.article_id} onValueChange={(v) => maj(i, { article_id: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogue.articles.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c.service_id} onValueChange={(v) => maj(i, { service_id: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogue.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={contenu.length === 1}
                  onClick={() => setContenu((cs) => cs.filter((_, j) => j !== i))}
                  aria-label="Retirer"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setContenu((cs) => [
                  ...cs,
                  {
                    article_id: catalogue.articles[0]?.id ?? "",
                    service_id: catalogue.services[0]?.id ?? "",
                    quantite: 1,
                  },
                ])
              }
            >
              <Plus />
              Ajouter un article
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-prix">Prix du forfait</Label>
            <Input
              id="f-prix"
              inputMode="numeric"
              value={prix ? formatFCFA(prix, false) : ""}
              onChange={(e) => setPrix(entier(e.target.value))}
              className="montant h-11 text-right"
            />
            {valeurNormale > 0 ? (
              <p className="text-xs text-muted-foreground">
                Au tarif normal : {formatFCFA(valeurNormale)}
                {prix > 0 && prix < valeurNormale
                  ? ` · économie client ${formatFCFA(valeurNormale - prix)}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={!valide || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({ nom: nom.trim(), prix, contenu })
                .then(() => {
                  toast.success(`Forfait « ${nom.trim()} » créé.`);
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            {enregistrer.isPending ? <Loader2 className="animate-spin" /> : null}
            Créer le forfait
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditeurForfaits({
  pressingId,
  catalogue,
  modifiable,
}: {
  pressingId: string;
  catalogue: Catalogue;
  modifiable: boolean;
}) {
  const { data = [] } = useForfaits(pressingId);
  const enregistrer = useEnregistrerForfait(pressingId);
  const [nouveau, setNouveau] = useState(false);
  const nomArticle = (id: string) => catalogue.articles.find((a) => a.id === id)?.nom ?? "?";
  const nomService = (id: string) => catalogue.services.find((s) => s.id === id)?.nom ?? "?";
  return (
    <div className="space-y-3">
      {modifiable ? (
        <Button onClick={() => setNouveau(true)}>
          <Plus />
          Nouveau forfait
        </Button>
      ) : null}
      {data.length === 0 ? (
        <EtatVide
          icone={Package}
          titre="Aucun forfait"
          texte="Exemple : « 10 chemises = 8 000 FCFA »."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p
                  className={
                    f.actif ? "font-medium" : "font-medium text-muted-foreground line-through"
                  }
                >
                  {f.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.contenu
                    .map(
                      (c) =>
                        `${c.quantite} × ${nomArticle(c.article_id)} (${nomService(c.service_id)})`,
                    )
                    .join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="montant font-semibold">{formatFCFA(f.prix)}</span>
                {modifiable ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      enregistrer.mutate({
                        id: f.id,
                        nom: f.nom,
                        prix: f.prix,
                        contenu: f.contenu,
                        actif: !f.actif,
                      })
                    }
                  >
                    {f.actif ? "Désactiver" : "Réactiver"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {nouveau ? (
        <DialogueForfait
          pressingId={pressingId}
          catalogue={catalogue}
          onFermer={() => setNouveau(false)}
        />
      ) : null}
    </div>
  );
}

export function EditeurFormules({
  pressingId,
  modifiable,
}: {
  pressingId: string;
  modifiable: boolean;
}) {
  const { data = [] } = useFormules(pressingId);
  const enregistrer = useEnregistrerFormule(pressingId);
  const [nom, setNom] = useState("");
  const [quota, setQuota] = useState("20");
  const [prix, setPrix] = useState(0);
  const [duree, setDuree] = useState("30");
  const valide = nom.trim().length >= 2 && entier(quota) > 0 && prix > 0 && entier(duree) > 0;
  return (
    <div className="space-y-4">
      {modifiable ? (
        <div className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_100px_140px_100px_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="fo-nom" className="text-xs">
              Nom de la formule
            </Label>
            <Input
              id="fo-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Mensuel 20 pièces"
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fo-q" className="text-xs">
              Pièces
            </Label>
            <Input
              id="fo-q"
              inputMode="numeric"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="h-10 text-right"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fo-p" className="text-xs">
              Prix
            </Label>
            <Input
              id="fo-p"
              inputMode="numeric"
              value={prix ? formatFCFA(prix, false) : ""}
              onChange={(e) => setPrix(entier(e.target.value))}
              className="montant h-10 text-right"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fo-d" className="text-xs">
              Durée (jours)
            </Label>
            <Input
              id="fo-d"
              inputMode="numeric"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              className="h-10 text-right"
            />
          </div>
          <Button
            className="h-10"
            disabled={!valide || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({
                  nom: nom.trim(),
                  quotaPieces: entier(quota),
                  prix,
                  dureeJours: entier(duree),
                })
                .then(() => {
                  toast.success(`Formule « ${nom.trim()} » créée.`);
                  setNom("");
                  setPrix(0);
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            <Plus />
            Créer
          </Button>
        </div>
      ) : null}
      {data.length === 0 ? (
        <EtatVide
          icone={Repeat}
          titre="Aucune formule d’abonnement"
          texte="Exemple : 20 pièces par mois pour 15 000 FCFA. L’abonnement se vend depuis la fiche du client."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span
                className={
                  f.actif ? "font-medium" : "font-medium text-muted-foreground line-through"
                }
              >
                {f.nom}
                <span className="block text-xs font-normal text-muted-foreground">
                  {f.quota_pieces} pièces · {f.duree_jours} jours
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="montant font-semibold">{formatFCFA(f.prix)}</span>
                {modifiable ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      enregistrer.mutate({
                        id: f.id,
                        nom: f.nom,
                        quotaPieces: f.quota_pieces ?? 0,
                        prix: f.prix,
                        dureeJours: f.duree_jours,
                        actif: !f.actif,
                      })
                    }
                  >
                    {f.actif ? "Désactiver" : "Réactiver"}
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
