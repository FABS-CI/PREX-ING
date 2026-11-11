import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Ban,
  CheckCheck,
  HandCoins,
  MessageCircle,
  PackageCheck,
  Printer,
  RotateCw,
  Truck,
  Tag,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  BadgeStatutDepot,
  BadgeStatutPaiement,
  BadgeStatutPaiementLigne,
} from "@/components/common/Badges";
import { Chargement } from "@/components/common/Chargement";
import { ZoneImpression, type ContenuImpression } from "@/components/comptoir/Impression";
import { DialogueAnnuler, DialogueEncaisser, DialogueRetrait } from "@/components/depots/Dialogues";
import { DialogueCourse } from "@/components/livraisons/Dialogues";
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
import { Input } from "@/components/ui/input";
import { useEspace } from "@/contexts/SessionContext";
import { modeleMessage } from "@/hooks/useCreerDepot";
import {
  useChangerStatut,
  useDepot,
  useModifierEmplacement,
  useStatutPaiement,
  type DepotDetail,
} from "@/hooks/useDepots";
import { messageErreur } from "@/lib/erreurs";
import {
  formatDate,
  formatDateHeure,
  formatFCFA,
  formatTelephone,
  lienWhatsApp,
  remplirModele,
} from "@/lib/format";
import { detailLigne } from "@/lib/comptoir";
import { etiquettesParLigne } from "@/lib/numerotation";
import { LIBELLES_MOYEN, LIBELLES_STATUT_DEPOT, type Paiement } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/depots/$id")({
  head: () => ({ meta: [{ title: "Dépôt — PREX’ING" }] }),
  component: FicheDepot,
});

type Dialogue = "encaisser" | "retrait" | "annuler" | "livraison" | null;

function FicheDepot() {
  const { id } = Route.useParams();
  const { pressing, boutique, profil, user, role } = useEspace();
  const { data, isLoading, error } = useDepot(id);
  const changerStatut = useChangerStatut();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [impression, setImpression] = useState<ContenuImpression | null>(null);
  const [whatsappPret, setWhatsappPret] = useState<string | null>(null);
  const [paiementAction, setPaiementAction] = useState<{
    p: Paiement;
    statut: "valide" | "annule";
  } | null>(null);
  const gestion = role === "proprietaire" || role === "gerant";

  useEffect(() => {
    if (!impression) return;
    const t = setTimeout(() => {
      window.print();
      setImpression(null);
    }, 150);
    return () => clearTimeout(t);
  }, [impression]);

  const pourImpression = useMemo(() => {
    if (!data) return null;
    const etiquettes = etiquettesParLigne(
      data.depot.numero,
      data.lignes.map((l) => l.quantite),
    );
    return {
      depot: data.depot,
      lignes: data.lignes,
      paiement: null,
      etiquettes: data.lignes.flatMap((l, i) =>
        (etiquettes[i]?.pieces ?? []).map((code) => ({ code, libelle: l.libelle })),
      ),
    };
  }, [data]);

  if (isLoading) return <Chargement />;
  if (error || !data)
    return (
      <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {messageErreur(error)}
      </p>
    );

  const d = data.depot;
  const c = data.client;
  const clos = d.statut === "retire" || d.statut === "annule";
  const pieces = data.lignes.reduce((a, l) => a + l.quantite, 0);

  async function passerA(statut: "en_traitement" | "pret") {
    try {
      await changerStatut.mutateAsync({ id: d.id, statut });
      toast.success(`Dépôt ${d.numero} : ${LIBELLES_STATUT_DEPOT[statut].toLowerCase()}.`);
      if (statut === "pret" && c?.consentement_messages) {
        const modele =
          (await modeleMessage(pressing.id, "linge_pret")) ??
          "Bonjour {client}, votre linge (dépôt n° {numero}) est prêt chez {boutique}. Reste à payer : {reste} FCFA.";
        setWhatsappPret(
          lienWhatsApp(
            c.telephone,
            remplirModele(modele, {
              client: c.nom,
              numero: d.numero,
              reste: formatFCFA(d.reste_a_payer, false),
              montant: formatFCFA(d.net_a_payer, false),
              date: formatDate(d.date_retrait_prevue),
              boutique: boutique.nom,
            }),
          ),
        );
      }
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <>
      <Link
        to="/depots"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Dépôts
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="montant text-3xl font-extrabold tracking-tight">{d.numero}</h1>
            <BadgeStatutDepot statut={d.statut} />
            {d.statut !== "annule" ? <BadgeStatutPaiement statut={d.statut_paiement} /> : null}
            {d.express ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                <Zap className="size-3" />
                Express
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {c ? (
              <Link
                to="/clients/$id"
                params={{ id: c.id }}
                className="font-medium text-foreground hover:underline"
              >
                {c.nom}
              </Link>
            ) : (
              "Client inconnu"
            )}
            {c ? ` · ${formatTelephone(c.telephone)}` : ""} · déposé le{" "}
            {formatDateHeure(d.created_at)} · retrait prévu le {formatDate(d.date_retrait_prevue)}
          </p>
          {d.statut === "annule" && d.annule_motif ? (
            <p className="mt-2 text-sm text-destructive">Motif d’annulation : {d.annule_motif}</p>
          ) : null}
          {d.retire_le ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Remis au client le {formatDateHeure(d.retire_le)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {d.statut === "recu" ? (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => void passerA("en_traitement")}
              disabled={changerStatut.isPending}
            >
              <RotateCw />
              Mettre en traitement
            </Button>
          ) : null}
          {d.statut === "recu" || d.statut === "en_traitement" ? (
            <Button
              className="h-11"
              onClick={() => void passerA("pret")}
              disabled={changerStatut.isPending}
            >
              <CheckCheck />
              Marquer prêt
            </Button>
          ) : null}
          {!clos && d.reste_a_payer > 0 ? (
            <Button variant="outline" className="h-11" onClick={() => setDialogue("encaisser")}>
              <HandCoins />
              Encaisser
            </Button>
          ) : null}
          {d.statut === "pret" && c ? (
            <Button variant="outline" className="h-11" onClick={() => setDialogue("livraison")}>
              <Truck />
              Programmer une livraison
            </Button>
          ) : null}
          {!clos && d.statut !== "en_attente" ? (
            <Button
              className="h-11 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => setDialogue("retrait")}
            >
              <PackageCheck />
              Remettre au client
            </Button>
          ) : null}
        </div>
      </div>

      {whatsappPret ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <span>Prévenez {c?.nom} que son linge est prêt.</span>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <a
                href={whatsappPret}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWhatsappPret(null)}
              >
                <MessageCircle />
                Envoyer par WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWhatsappPret(null)}>
              Plus tard
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border bg-card">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">
                Articles · {pieces} pièce{pieces > 1 ? "s" : ""}
              </h2>
            </header>
            <ul className="divide-y">
              {data.lignes.map((l) => (
                <li key={l.id} className={cn("px-4 py-3", l.statut === "retire" && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{l.libelle}</p>
                      <p className="text-xs text-muted-foreground">
                        {detailLigne(l)}
                        {l.etiquette ? ` · ${l.etiquette}` : ""}
                      </p>
                      {l.observations ? (
                        <p className="mt-0.5 text-xs text-warning">{l.observations}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="montant font-semibold">{formatFCFA(l.total)}</span>
                      {l.statut === "retire" ? <BadgeStatutDepot statut="retire" /> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t bg-muted/30 px-4 py-3 text-sm">
              <Ligne libelle="Total" valeur={formatFCFA(d.total_ht)} />
              {d.remise > 0 ? <Ligne libelle="Remise" valeur={`−${formatFCFA(d.remise)}`} /> : null}
              <Ligne libelle="Net à payer" valeur={formatFCFA(d.net_a_payer)} fort />
              <Ligne libelle="Déjà payé" valeur={formatFCFA(d.deja_paye)} />
              <Ligne
                libelle="Reste à payer"
                valeur={formatFCFA(d.reste_a_payer)}
                fort
                ton={d.reste_a_payer > 0 && d.statut !== "annule" ? "alerte" : "succes"}
              />
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-card">
            <header className="border-b px-4 py-3">
              <h2 className="font-semibold">Paiements</h2>
            </header>
            {data.paiements.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Aucun paiement.</p>
            ) : (
              <ul className="divide-y">
                {data.paiements.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{LIBELLES_MOYEN[p.moyen]}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateHeure(p.created_at)}
                        {p.reference_operateur ? ` · réf. ${p.reference_operateur}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeStatutPaiementLigne statut={p.statut} />
                      <span className="montant font-semibold">{formatFCFA(p.montant)}</span>
                      {gestion && p.statut === "a_verifier" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPaiementAction({ p, statut: "valide" })}
                        >
                          Valider
                        </Button>
                      ) : null}
                      {gestion && (p.statut === "a_verifier" || p.statut === "valide") ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setPaiementAction({ p, statut: "annule" })}
                        >
                          Annuler
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Emplacement depot={d} />

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Historique</h2>
            <ol className="relative space-y-3 border-l pl-4">
              {data.historique.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" />
                  <p className="font-medium">
                    {h.ancien ? `${LIBELLES_STATUT_DEPOT[h.ancien]} → ` : ""}
                    {LIBELLES_STATUT_DEPOT[h.nouveau]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateHeure(h.created_at)}
                    {h.profiles?.nom ? ` · ${h.profiles.nom}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <Button
              variant="outline"
              className="h-11 w-full justify-start"
              onClick={() => setImpression("ticket")}
            >
              <Printer />
              Réimprimer le ticket
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-start"
              onClick={() => setImpression("etiquettes")}
            >
              <Tag />
              Réimprimer les étiquettes
            </Button>
            {gestion && !clos ? (
              <Button
                variant="ghost"
                className="h-11 w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setDialogue("annuler")}
              >
                <Ban />
                Annuler le dépôt
              </Button>
            ) : null}
          </section>
        </aside>
      </div>

      {dialogue === "encaisser" ? (
        <DialogueEncaisser ouvert detail={data} onFermer={() => setDialogue(null)} />
      ) : null}
      {dialogue === "retrait" ? (
        <DialogueRetrait
          ouvert
          detail={data}
          peutForcer={gestion}
          onFermer={() => setDialogue(null)}
          onEncaisser={() => setDialogue("encaisser")}
        />
      ) : null}
      {dialogue === "livraison" && c ? (
        <DialogueCourse
          type="livraison"
          depot={{ id: d.id, numero: d.numero, net_a_payer: d.net_a_payer - d.frais_livraison }}
          clientInitial={{
            id: c.id,
            nom: c.nom,
            telephone: c.telephone,
            solde_du: 0,
            consentement_messages: c.consentement_messages,
          }}
          onFermer={() => setDialogue(null)}
        />
      ) : null}
      {dialogue === "annuler" ? (
        <DialogueAnnuler ouvert detail={data} onFermer={() => setDialogue(null)} />
      ) : null}

      <ConfirmationPaiement
        action={paiementAction}
        depotId={d.id}
        onFermer={() => setPaiementAction(null)}
      />

      {pourImpression && c ? (
        <ZoneImpression
          contenu={impression}
          depot={pourImpression}
          client={c}
          pressing={pressing}
          boutique={boutique}
          caissier={profil?.nom ?? user.email ?? ""}
          duplicata
        />
      ) : null}
    </>
  );
}

function Ligne({
  libelle,
  valeur,
  fort = false,
  ton,
}: {
  libelle: string;
  valeur: string;
  fort?: boolean;
  ton?: "alerte" | "succes";
}) {
  return (
    <div
      className={cn(
        "flex justify-between",
        fort && "font-semibold",
        ton === "alerte" && "text-destructive",
        ton === "succes" && "text-success",
      )}
    >
      <dt className={cn(!fort && "text-muted-foreground")}>{libelle}</dt>
      <dd className="montant">{valeur}</dd>
    </div>
  );
}

function Emplacement({ depot }: { depot: DepotDetail["depot"] }) {
  const [valeur, setValeur] = useState(depot.emplacement ?? "");
  const modifier = useModifierEmplacement();
  const change = valeur.trim() !== (depot.emplacement ?? "");
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-2 font-semibold">Emplacement</h2>
      <div className="flex gap-2">
        <Input
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder="Étagère, casier…"
          className="h-10"
        />
        <Button
          variant="outline"
          className="h-10"
          disabled={!change || modifier.isPending}
          onClick={() =>
            modifier
              .mutateAsync({ id: depot.id, emplacement: valeur })
              .then(() => toast.success("Emplacement enregistré."))
              .catch((e: unknown) => toast.error(messageErreur(e)))
          }
        >
          OK
        </Button>
      </div>
    </section>
  );
}

function ConfirmationPaiement({
  action,
  depotId,
  onFermer,
}: {
  action: { p: Paiement; statut: "valide" | "annule" } | null;
  depotId: string;
  onFermer: () => void;
}) {
  const maj = useStatutPaiement();
  if (!action) return null;
  const { p, statut } = action;
  return (
    <AlertDialog open onOpenChange={(o) => !o && onFermer()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {statut === "valide" ? "Valider" : "Annuler"} le paiement de {formatFCFA(p.montant)} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {statut === "valide"
              ? `Confirmez que la transaction ${LIBELLES_MOYEN[p.moyen]}${p.reference_operateur ? ` ${p.reference_operateur}` : ""} a bien été reçue. Le montant sera déduit du reste à payer.`
              : "Le paiement reste visible dans l’historique avec le statut « Annulé » ; il n’est plus compté."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Retour</AlertDialogCancel>
          <AlertDialogAction
            className={
              statut === "annule"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
            onClick={() =>
              maj
                .mutateAsync({ id: p.id, depotId, statut })
                .then(() =>
                  toast.success(statut === "valide" ? "Paiement validé." : "Paiement annulé."),
                )
                .catch((e: unknown) => toast.error(messageErreur(e)))
                .finally(onFermer)
            }
          >
            {statut === "valide" ? "Valider le paiement" : "Annuler le paiement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
