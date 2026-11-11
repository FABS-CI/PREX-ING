import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ClientDialog } from "@/components/clients/ClientForm";
import {
  BadgeStatutDepot,
  BadgeStatutPaiement,
  BadgeStatutPaiementLigne,
} from "@/components/common/Badges";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import {
  useClient,
  useClientAbonnements,
  useClientDepots,
  useClientPaiements,
  useSupprimerClient,
} from "@/hooks/useClients";
import { messageErreur } from "@/lib/erreurs";
import {
  formatDate,
  formatDateHeure,
  formatFCFA,
  formatTelephone,
  initiales,
  lienWhatsApp,
} from "@/lib/format";
import { LIBELLES_MOYEN } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText, Shirt, Wallet, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — PREX’ING" }] }),
  component: FicheClient,
});

function Chiffre({
  libelle,
  valeur,
  alerte = false,
}: {
  libelle: string;
  valeur: string;
  alerte?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground">{libelle}</p>
      <p className={cn("montant mt-0.5 text-lg font-bold", alerte && "text-destructive")}>
        {valeur}
      </p>
    </div>
  );
}

function FicheClient() {
  const { id } = Route.useParams();
  const { pressing, peut } = useEspace();
  const navigate = useNavigate();
  const { data, isLoading, error } = useClient(id);
  const depots = useClientDepots(id);
  const paiements = useClientPaiements(id);
  const abonnements = useClientAbonnements(id);
  const supprimer = useSupprimerClient();
  const [edition, setEdition] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  if (isLoading) return <Chargement />;
  if (error)
    return (
      <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {messageErreur(error)}
      </p>
    );
  if (!data?.client) {
    return (
      <EtatVide
        icone={FileText}
        titre="Client introuvable"
        texte="Cette fiche n’existe pas ou a été supprimée."
        action={
          <Button asChild variant="outline">
            <Link to="/clients">Retour aux clients</Link>
          </Button>
        }
      />
    );
  }

  const c = data.client;
  const s = data.solde;
  const soldeDu = s?.solde_du ?? 0;

  async function confirmerSuppression() {
    try {
      await supprimer.mutateAsync(c.id);
      toast.success(`${c.nom} a été supprimé.`);
      void navigate({ to: "/clients" });
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <>
      <Link
        to="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clients
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {initiales(c.nom)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{c.nom}</h1>
              {soldeDu > 0 ? (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  Débiteur
                </span>
              ) : null}
            </div>
            <p className="montant text-sm text-muted-foreground">
              {formatTelephone(c.telephone)}
              {c.telephone2 ? ` · ${formatTelephone(c.telephone2)}` : ""}
              {c.quartier ? ` · ${c.quartier}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href={`tel:${c.telephone}`}>
              <Phone />
              Appeler
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href={lienWhatsApp(c.telephone)} target="_blank" rel="noreferrer">
              <MessageCircle />
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setEdition(true)}>
            <Pencil />
            Modifier
          </Button>
          {peut("supprimer") ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-destructive hover:text-destructive"
              onClick={() => {
                if (soldeDu > 0) {
                  toast.error(
                    `Suppression impossible : ce client doit encore ${formatFCFA(soldeDu)}.`,
                  );
                  return;
                }
                setConfirmation(true);
              }}
            >
              <Trash2 />
              Supprimer
            </Button>
          ) : null}
          <Button asChild size="sm" className="h-9">
            <Link to="/comptoir" search={{ client: c.id }}>
              <Plus />
              Nouveau dépôt
            </Link>
          </Button>
        </div>
      </div>

      <section className="mb-6 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-2xl border bg-card lg:grid-cols-4 lg:divide-y-0">
        <Chiffre libelle="Total dépensé" valeur={formatFCFA(s?.total_depense ?? 0)} />
        <Chiffre libelle="Dépôts" valeur={String(s?.nb_depots ?? 0)} />
        <Chiffre libelle="Solde dû" valeur={formatFCFA(soldeDu)} alerte={soldeDu > 0} />
        <Chiffre libelle="Dernière visite" valeur={formatDate(s?.derniere_visite)} />
      </section>

      {!c.consentement_messages ? (
        <p className="mb-4 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          Ce client n’a pas accepté de recevoir des messages WhatsApp / SMS.
        </p>
      ) : null}

      <Tabs defaultValue="depots">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="depots">Dépôts</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="depots">
          {depots.isLoading ? <Chargement /> : null}
          {depots.data?.length === 0 ? <EtatVide icone={Shirt} titre="Aucun dépôt" /> : null}
          {depots.data && depots.data.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {depots.data.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{d.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      Déposé le {formatDate(d.created_at)} · retrait{" "}
                      {formatDate(d.date_retrait_prevue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BadgeStatutDepot statut={d.statut} />
                    <BadgeStatutPaiement statut={d.statut_paiement} />
                    <div className="text-right">
                      <p className="montant text-sm font-semibold">{formatFCFA(d.net_a_payer)}</p>
                      {d.reste_a_payer > 0 ? (
                        <p className="montant text-xs text-destructive">
                          reste {formatFCFA(d.reste_a_payer)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>

        <TabsContent value="paiements">
          {paiements.isLoading ? <Chargement /> : null}
          {paiements.data?.length === 0 ? <EtatVide icone={Wallet} titre="Aucun paiement" /> : null}
          {paiements.data && paiements.data.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {paiements.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium">
                      {LIBELLES_MOYEN[p.moyen]}
                      {p.depots ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {p.depots.numero}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateHeure(p.created_at)}
                      {p.reference_operateur ? ` · réf. ${p.reference_operateur}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BadgeStatutPaiementLigne statut={p.statut} />
                    <span className="montant font-semibold">{formatFCFA(p.montant)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>

        <TabsContent value="abonnements">
          {abonnements.data?.length === 0 ? (
            <EtatVide
              icone={Repeat}
              titre="Aucun abonnement"
              texte="Les abonnements clients arrivent avec le module « Modes avancés »."
            />
          ) : null}
          {abonnements.data && abonnements.data.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {abonnements.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    {a.quota_pieces != null
                      ? `${a.consomme_pieces} / ${a.quota_pieces} pièces`
                      : `${a.consomme_kg} / ${a.quota_kg} kg`}
                  </span>
                  <span className="text-muted-foreground">jusqu’au {formatDate(a.fin)}</span>
                  <span className="font-medium">{a.statut}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-2xl border bg-card p-4 text-sm leading-relaxed">
            {c.notes ? (
              <p className="whitespace-pre-line">{c.notes}</p>
            ) : (
              <p className="text-muted-foreground">Aucune note.</p>
            )}
            {c.adresse ? <p className="mt-3 text-muted-foreground">Adresse : {c.adresse}</p> : null}
            {c.date_naissance ? (
              <p className="mt-1 text-muted-foreground">
                Anniversaire : {formatDate(c.date_naissance)}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              Client depuis le {formatDate(c.created_at)}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <ClientDialog
        ouvert={edition}
        onFermer={() => setEdition(false)}
        pressingId={pressing.id}
        client={c}
        onEnregistre={() => {
          setEdition(false);
          toast.success("Fiche client enregistrée.");
        }}
      />

      <AlertDialog open={confirmation} onOpenChange={setConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {c.nom} ?</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche disparaît des listes. Son historique (dépôts, paiements) reste conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmerSuppression()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
