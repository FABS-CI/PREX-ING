import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { PageHeader } from "@/components/common/PageHeader";
import { QrCode } from "@/components/common/QrCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEspace } from "@/contexts/SessionContext";
import {
  lienPagePressing,
  useModifierBoutique,
  useModifierSlug,
  useSlugPressing,
} from "@/hooks/usePortail";
import { messageErreur } from "@/lib/erreurs";
import { codeAppareil, definirCodeAppareil } from "@/lib/numerotation";

export const Route = createFileRoute("/_app/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — PREX’ING" }] }),
  component: ParametresPage,
});

function Section({
  titre,
  description,
  children,
}: {
  titre: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{titre}</h2>
      {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Boutique() {
  const { boutique, recharger } = useEspace();
  const modifier = useModifierBoutique();
  const [v, setV] = useState({
    nom: boutique.nom,
    adresse: boutique.adresse ?? "",
    commune: boutique.commune ?? "",
    telephone: boutique.telephone ?? "",
    pied_ticket: boutique.pied_ticket ?? "",
  });
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Section
      titre="Boutique"
      description="Ces informations apparaissent sur les tickets et sur votre page publique."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ id="b-nom" libelle="Nom">
          <Input id="b-nom" value={v.nom} onChange={maj("nom")} className="h-11" />
        </Champ>
        <Champ id="b-tel" libelle="Téléphone">
          <Input
            id="b-tel"
            type="tel"
            value={v.telephone}
            onChange={maj("telephone")}
            className="h-11"
          />
        </Champ>
        <Champ id="b-adr" libelle="Adresse">
          <Input id="b-adr" value={v.adresse} onChange={maj("adresse")} className="h-11" />
        </Champ>
        <Champ id="b-com" libelle="Commune">
          <Input id="b-com" value={v.commune} onChange={maj("commune")} className="h-11" />
        </Champ>
      </div>
      <div className="mt-3">
        <Champ id="b-pied" libelle="Message en bas du ticket">
          <Input id="b-pied" value={v.pied_ticket} onChange={maj("pied_ticket")} className="h-11" />
        </Champ>
      </div>
      <Button
        className="mt-4"
        disabled={v.nom.trim().length < 2 || modifier.isPending}
        onClick={() =>
          modifier
            .mutateAsync({ id: boutique.id, ...v })
            .then(() => {
              toast.success("Boutique enregistrée.");
              return recharger();
            })
            .catch((e: unknown) => toast.error(messageErreur(e)))
        }
      >
        {modifier.isPending ? <Loader2 className="animate-spin" /> : null}Enregistrer
      </Button>
    </Section>
  );
}

function PageEnLigne() {
  const { pressing } = useEspace();
  const { data: slug } = useSlugPressing(pressing.id);
  const modifier = useModifierSlug(pressing.id);
  const [saisie, setSaisie] = useState<string | null>(null);
  if (!slug) return null;
  const lien = lienPagePressing(slug);
  return (
    <Section
      titre="Page en ligne"
      description="Vos clients y voient vos tarifs et demandent un ramassage, sans rien installer."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="rounded-xl border bg-white p-2">
          <QrCode valeur={lien} taille={132} label="QR code de votre page" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <a
            href={lien}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-medium text-primary underline dark:text-info"
          >
            {lien}
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void navigator.clipboard.writeText(lien).then(() => toast.success("Lien copié."))
            }
          >
            <Copy />
            Copier le lien
          </Button>
          <Champ
            id="slug"
            libelle="Adresse de la page"
            aide="Lettres, chiffres et tirets. Changer l’adresse rend l’ancien lien invalide."
          >
            <div className="flex gap-2">
              <Input
                id="slug"
                value={saisie ?? slug}
                onChange={(e) => setSaisie(e.target.value)}
                className="h-10"
              />
              <Button
                className="h-10"
                disabled={!saisie || saisie === slug || modifier.isPending}
                onClick={() =>
                  modifier
                    .mutateAsync(saisie ?? slug)
                    .then(() => {
                      toast.success("Adresse modifiée.");
                      setSaisie(null);
                    })
                    .catch((e: unknown) => toast.error(messageErreur(e)))
                }
              >
                OK
              </Button>
            </div>
          </Champ>
        </div>
      </div>
    </Section>
  );
}

function Appareil() {
  const [code, setCode] = useState(codeAppareil());
  return (
    <Section
      titre="Cet appareil"
      description="Code utilisé dans les numéros de dépôt créés ici (ex. A-B2-0043). Chaque appareil d’une boutique doit avoir un code différent."
    >
      <div className="flex gap-2">
        <Input
          value={code}
          maxLength={2}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-10 w-24 text-center font-semibold tracking-widest"
          aria-label="Code de l’appareil"
        />
        <Button
          className="h-10"
          variant="outline"
          onClick={() => {
            try {
              definirCodeAppareil(code);
              toast.success("Code de l’appareil enregistré.");
            } catch (e) {
              toast.error(messageErreur(e));
            }
          }}
        >
          Enregistrer
        </Button>
      </div>
    </Section>
  );
}

function ParametresPage() {
  return (
    <>
      <PageHeader titre="Paramètres" />
      <div className="space-y-6">
        <Boutique />
        <PageEnLigne />
        <Appareil />
      </div>
    </>
  );
}
