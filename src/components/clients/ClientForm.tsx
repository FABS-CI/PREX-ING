import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { z } from "zod";

import { Champ } from "@/components/common/Champ";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  clientParTelephone,
  useCreerClient,
  useModifierClient,
  type DonneesClient,
} from "@/hooks/useClients";
import { estDoublon, messageErreur } from "@/lib/erreurs";
import { formatTelephone, normaliserTelephone, telephoneValide } from "@/lib/format";
import type { Client } from "@/lib/types";

const telephone = z
  .string()
  .refine(
    telephoneValide,
    "Numéro ivoirien à 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.",
  );

const schema = z.object({
  nom: z.string().trim().min(2, "Indiquez le nom du client."),
  telephone,
  telephone2: z.union([z.literal(""), telephone]),
  adresse: z.string().trim(),
  quartier: z.string().trim(),
  notes: z.string().trim(),
  date_naissance: z.string(),
  consentement_messages: z.boolean(),
});

type Valeurs = z.infer<typeof schema>;

function valeursInitiales(
  c?: Client | null,
  telephoneInitial?: string,
  nomInitial?: string,
): Valeurs {
  return {
    nom: c?.nom ?? nomInitial ?? "",
    telephone: c ? formatTelephone(c.telephone) : (telephoneInitial ?? ""),
    telephone2: c?.telephone2 ? formatTelephone(c.telephone2) : "",
    adresse: c?.adresse ?? "",
    quartier: c?.quartier ?? "",
    notes: c?.notes ?? "",
    date_naissance: c?.date_naissance ?? "",
    consentement_messages: c?.consentement_messages ?? false,
  };
}

const vide = (s: string) => (s.trim() === "" ? null : s.trim());

export interface ClientFormProps {
  pressingId: string;
  client?: Client | null;
  /** « rapide » : nom + téléphone visibles, le reste replié (comptoir). */
  mode?: "complet" | "rapide";
  /** Pré-remplissage depuis une recherche (chiffres → téléphone, lettres → nom). */
  saisieInitiale?: string;
  onEnregistre: (client: Client) => void;
  onAnnuler?: () => void;
}

export function ClientForm({
  pressingId,
  client,
  mode = "complet",
  saisieInitiale,
  onEnregistre,
  onAnnuler,
}: ClientFormProps) {
  const estTel = saisieInitiale ? /^[\d\s+]+$/.test(saisieInitiale) : false;
  const [v, setV] = useState<Valeurs>(() =>
    valeursInitiales(
      client,
      estTel ? saisieInitiale : undefined,
      !estTel ? saisieInitiale : undefined,
    ),
  );
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Valeurs, string>>>({});
  const [doublon, setDoublon] = useState<{ id: string; nom: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [plus, setPlus] = useState(mode === "complet");
  const creer = useCreerClient(pressingId);
  const modifier = useModifierClient();
  const envoi = creer.isPending || modifier.isPending;

  const maj = <K extends keyof Valeurs>(cle: K, valeur: Valeurs[K]) =>
    setV((p) => ({ ...p, [cle]: valeur }));

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setDoublon(null);
    const r = schema.safeParse(v);
    if (!r.success) {
      const errs: Partial<Record<keyof Valeurs, string>> = {};
      for (const issue of r.error.issues) {
        const cle = issue.path[0] as keyof Valeurs;
        errs[cle] ??= issue.message;
      }
      setErreurs(errs);
      if (errs.telephone2 || errs.adresse || errs.quartier || errs.notes) setPlus(true);
      return;
    }
    setErreurs({});
    const d: DonneesClient = {
      nom: r.data.nom,
      telephone: normaliserTelephone(r.data.telephone),
      telephone2: r.data.telephone2 ? normaliserTelephone(r.data.telephone2) : null,
      adresse: vide(r.data.adresse),
      quartier: vide(r.data.quartier),
      notes: vide(r.data.notes),
      date_naissance: vide(r.data.date_naissance),
      consentement_messages: r.data.consentement_messages,
    };
    try {
      const enregistre = client
        ? await modifier.mutateAsync({ id: client.id, ...d })
        : await creer.mutateAsync(d);
      onEnregistre(enregistre);
    } catch (err) {
      if (estDoublon(err)) {
        const proprietaire = await clientParTelephone(pressingId, d.telephone);
        if (proprietaire) setDoublon(proprietaire);
        else setErreur("Ce numéro appartient déjà à un autre client.");
        setErreurs({ telephone: "Numéro déjà utilisé." });
      } else {
        setErreur(messageErreur(err));
      }
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-4" noValidate>
      <Champ id="cl-nom" libelle="Nom" erreur={erreurs.nom}>
        <Input
          id="cl-nom"
          value={v.nom}
          onChange={(e) => maj("nom", e.target.value)}
          className="h-11"
          autoFocus={!v.nom}
        />
      </Champ>
      <Champ id="cl-tel" libelle="Téléphone" erreur={erreurs.telephone}>
        <Input
          id="cl-tel"
          type="tel"
          inputMode="tel"
          placeholder="07 07 07 07 07"
          value={v.telephone}
          onChange={(e) => maj("telephone", e.target.value)}
          onBlur={() =>
            telephoneValide(v.telephone) && maj("telephone", formatTelephone(v.telephone))
          }
          className="h-11"
          autoFocus={Boolean(v.nom) && !v.telephone}
        />
      </Champ>
      {doublon ? (
        <p className="rounded-lg bg-warning/10 p-3 text-sm" role="alert">
          Ce numéro appartient déjà à <strong>{doublon.nom}</strong>.{" "}
          <Link
            to="/clients/$id"
            params={{ id: doublon.id }}
            className="font-medium text-primary underline dark:text-info"
          >
            Voir sa fiche
          </Link>
        </p>
      ) : null}

      <label className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          checked={v.consentement_messages}
          onCheckedChange={(c) => maj("consentement_messages", c === true)}
          className="mt-0.5"
        />
        <span className="text-sm leading-snug">
          Accepte de recevoir des messages WhatsApp / SMS
          <span className="block text-xs text-muted-foreground">
            Reçus, linge prêt, rappels. Le client peut refuser à tout moment.
          </span>
        </span>
      </label>

      {mode === "rapide" ? (
        <button
          type="button"
          onClick={() => setPlus((p) => !p)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={plus}
        >
          <ChevronDown className={`size-4 transition-transform ${plus ? "rotate-180" : ""}`} />
          Plus d’informations
        </button>
      ) : null}

      {plus ? (
        <div className="space-y-4">
          <Champ id="cl-tel2" libelle="Deuxième téléphone" erreur={erreurs.telephone2}>
            <Input
              id="cl-tel2"
              type="tel"
              inputMode="tel"
              value={v.telephone2}
              onChange={(e) => maj("telephone2", e.target.value)}
              className="h-11"
            />
          </Champ>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ id="cl-quartier" libelle="Quartier">
              <Input
                id="cl-quartier"
                value={v.quartier}
                onChange={(e) => maj("quartier", e.target.value)}
                className="h-11"
                placeholder="Angré 8e tranche"
              />
            </Champ>
            <Champ id="cl-naissance" libelle="Anniversaire">
              <Input
                id="cl-naissance"
                type="date"
                value={v.date_naissance}
                onChange={(e) => maj("date_naissance", e.target.value)}
                className="h-11"
              />
            </Champ>
          </div>
          <Champ id="cl-adresse" libelle="Adresse / repère">
            <Input
              id="cl-adresse"
              value={v.adresse}
              onChange={(e) => maj("adresse", e.target.value)}
              className="h-11"
              placeholder="Près de la pharmacie…"
            />
          </Champ>
          <div className="space-y-1.5">
            <Label htmlFor="cl-notes">Notes</Label>
            <Textarea
              id="cl-notes"
              value={v.notes}
              onChange={(e) => maj("notes", e.target.value)}
              placeholder="Client VIP, allergique à tel produit…"
              rows={3}
            />
          </div>
        </div>
      ) : null}

      {erreur ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{erreur}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        {onAnnuler ? (
          <Button type="button" variant="outline" onClick={onAnnuler} className="h-11">
            Annuler
          </Button>
        ) : null}
        <Button type="submit" disabled={envoi} className="h-11 min-w-[140px]">
          {envoi ? <Loader2 className="animate-spin" /> : null}
          {client ? "Enregistrer" : "Créer le client"}
        </Button>
      </div>
    </form>
  );
}

export function ClientDialog({
  ouvert,
  onFermer,
  ...props
}: Omit<ClientFormProps, "onAnnuler"> & { ouvert: boolean; onFermer: () => void }) {
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>
            {props.mode === "rapide"
              ? "Le nom et le téléphone suffisent."
              : "Le téléphone identifie le client dans votre pressing."}
          </DialogDescription>
        </DialogHeader>
        {ouvert ? <ClientForm {...props} onAnnuler={onFermer} /> : null}
      </DialogContent>
    </Dialog>
  );
}
