import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Globe, MessageCircle, Phone, ShoppingBasket, X } from "lucide-react";
import { toast } from "sonner";

import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import {
  lienPagePressing,
  useCommandesEnLigne,
  useSlugPressing,
  useStatutCommande,
  type CommandeEnLigne,
} from "@/hooks/usePortail";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatDateHeure, formatTelephone, lienWhatsApp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/commandes")({
  head: () => ({ meta: [{ title: "Commandes en ligne — PREX’ING" }] }),
  component: CommandesPage,
});

const LIBELLES: Record<CommandeEnLigne["statut"], string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  convertie: "Traitée",
  annulee: "Annulée",
};
const creneau = (iso: string | null) => {
  if (!iso) return "";
  const h = new Date(iso).getHours();
  return `${formatDate(iso)} · ${h < 12 ? "matin" : h < 16 ? "après-midi" : "soir"}`;
};

function CommandesPage() {
  const { pressing, boutique } = useEspace();
  const [toutes, setToutes] = useState(false);
  const { data, isLoading } = useCommandesEnLigne(boutique.id, toutes);
  const { data: slug } = useSlugPressing(pressing.id);
  const statut = useStatutCommande();
  const changer = (id: string, s: CommandeEnLigne["statut"], msg: string) =>
    statut
      .mutateAsync({ id, statut: s })
      .then(() => toast.success(msg))
      .catch((e: unknown) => toast.error(messageErreur(e)));

  return (
    <>
      <PageHeader
        titre="Commandes en ligne"
        description="Demandes de ramassage envoyées depuis votre page publique."
      />
      {slug ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Globe className="size-4 text-info" />
          <span className="min-w-0 flex-1 truncate">
            Votre page :{" "}
            <a
              href={lienPagePressing(slug)}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline dark:text-info"
            >
              {lienPagePressing(slug)}
            </a>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void navigator.clipboard
                .writeText(lienPagePressing(slug))
                .then(() => toast.success("Lien copié : partagez-le sur WhatsApp et Facebook."))
            }
          >
            <Copy />
            Copier
          </Button>
        </div>
      ) : null}
      <Tabs value={toutes ? "toutes" : "afaire"} onValueChange={(v) => setToutes(v === "toutes")}>
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="afaire">À traiter</TabsTrigger>
          <TabsTrigger value="toutes">Toutes</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Chargement />
      ) : !data?.length ? (
        <EtatVide
          icone={ShoppingBasket}
          titre="Aucune commande en ligne"
          texte="Partagez le lien de votre page : vos clients pourront demander un ramassage et voir vos tarifs."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.clients?.nom ?? "Client"}</p>
                  <p className="text-sm">
                    {c.adresse}
                    {c.articles[0]?.repere ? ` · ${c.articles[0].repere}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Passage souhaité : {creneau(c.creneau)} · reçue le{" "}
                    {formatDateHeure(c.created_at)}
                  </p>
                  {c.articles[0]?.note ? (
                    <p className="mt-1 text-sm">« {c.articles[0].note} »</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    c.statut === "nouvelle"
                      ? "bg-warning/15 text-warning"
                      : c.statut === "confirmee"
                        ? "bg-info/15 text-info"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {LIBELLES[c.statut]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.clients?.telephone ? (
                  <>
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${c.clients.telephone}`}>
                        <Phone />
                        {formatTelephone(c.clients.telephone)}
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={lienWhatsApp(
                          c.clients.telephone,
                          `Bonjour ${c.clients.nom}, nous avons bien reçu votre demande de ramassage. Notre livreur passera le ${creneau(c.creneau)}.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle />
                        Confirmer par WhatsApp
                      </a>
                    </Button>
                  </>
                ) : null}
                {c.statut === "nouvelle" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void changer(
                        c.id,
                        "confirmee",
                        "Commande confirmée. Affectez le ramassage dans Livraisons.",
                      )
                    }
                  >
                    <Check />
                    Confirmée
                  </Button>
                ) : null}
                {c.statut === "nouvelle" || c.statut === "confirmee" ? (
                  <>
                    {c.client_id ? (
                      <Button asChild size="sm">
                        <Link
                          to="/comptoir"
                          search={{ client: c.client_id }}
                          onClick={() => void changer(c.id, "convertie", "Commande traitée.")}
                        >
                          Créer le dépôt
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => void changer(c.id, "annulee", "Commande annulée.")}
                    >
                      <X />
                      Annuler
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Chaque demande crée aussi un ramassage « À planifier » dans Livraisons, à affecter à un
        livreur.
      </p>
    </>
  );
}
