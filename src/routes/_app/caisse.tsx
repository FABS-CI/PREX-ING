import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Loader2, Lock, LockOpen, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Comptage } from "@/components/caisse/Comptage";
import { BadgeStatutPaiementLigne } from "@/components/common/Badges";
import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEspace } from "@/contexts/SessionContext";
import {
  useCloturerCaisse,
  useHistoriqueCaisse,
  useMouvementCaisse,
  useOuvrirCaisse,
  usePaiementsAVerifier,
  useResumeSession,
  useSessionOuverte,
  useStatutPaiementCaisse,
  type SessionCaisse,
} from "@/hooks/useCaisse";
import { messageErreur } from "@/lib/erreurs";
import { formatDateHeure, formatFCFA } from "@/lib/format";
import { LIBELLES_MOYEN } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/caisse")({
  head: () => ({ meta: [{ title: "Caisse — PREX’ING" }] }),
  component: CaissePage,
});

function SaisieMontant({
  id,
  valeur,
  onChange,
  autoFocus,
}: {
  id: string;
  valeur: number;
  onChange: (n: number) => void;
  autoFocus?: boolean;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      value={valeur ? formatFCFA(valeur, false) : ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      onFocus={(e) => e.target.select()}
      className="montant h-12 text-right text-lg"
      autoFocus={autoFocus}
    />
  );
}

function OuvertureCaisse() {
  const { pressing, boutique } = useEspace();
  const ouvrir = useOuvrirCaisse();
  const [fond, setFond] = useState(0);
  return (
    <section className="mx-auto max-w-md rounded-2xl border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <LockOpen className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">La caisse est fermée</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comptez l’argent présent dans le tiroir et indiquez-le comme fond de caisse.
      </p>
      <div className="mt-5 text-left">
        <Champ id="fond" libelle="Fond de caisse">
          <SaisieMontant id="fond" valeur={fond} onChange={setFond} autoFocus />
        </Champ>
      </div>
      <Button
        className="mt-4 h-12 w-full text-base"
        disabled={ouvrir.isPending}
        onClick={() =>
          ouvrir
            .mutateAsync({ pressingId: pressing.id, boutiqueId: boutique.id, fond })
            .then(() => toast.success(`Caisse ouverte avec ${formatFCFA(fond)}.`))
            .catch((e: unknown) => toast.error(messageErreur(e)))
        }
      >
        {ouvrir.isPending ? <Loader2 className="animate-spin" /> : null}
        Ouvrir la caisse
      </Button>
    </section>
  );
}

function DialogueMouvement({
  session,
  type,
  onFermer,
}: {
  session: SessionCaisse;
  type: "entree" | "sortie";
  onFermer: () => void;
}) {
  const [montant, setMontant] = useState(0);
  const [motif, setMotif] = useState("");
  const enregistrer = useMouvementCaisse();
  const valide = montant > 0 && motif.trim().length >= 3;
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "entree" ? "Entrée d’argent" : "Sortie d’argent"}</DialogTitle>
          <DialogDescription>
            {type === "entree"
              ? "Argent ajouté au tiroir hors encaissement (ex. monnaie apportée)."
              : "Argent retiré du tiroir (ex. achat de lessive, versement à la banque)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Champ id="mvt-montant" libelle="Montant">
            <SaisieMontant id="mvt-montant" valeur={montant} onChange={setMontant} autoFocus />
          </Champ>
          <Champ id="mvt-motif" libelle="Motif">
            <Input
              id="mvt-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="h-11"
            />
          </Champ>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={!valide || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({ session, type, montant, motif })
                .then(() => {
                  toast.success(
                    `${type === "entree" ? "Entrée" : "Sortie"} de ${formatFCFA(montant)} enregistrée.`,
                  );
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueCloture({
  session,
  theorique,
  onFermer,
}: {
  session: SessionCaisse;
  theorique: number;
  onFermer: () => void;
}) {
  const [parCoupures, setParCoupures] = useState(true);
  const [compte, setCompte] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const cloturer = useCloturerCaisse();
  const ecart = compte - theorique;
  const justificationManquante = ecart !== 0 && commentaire.trim().length < 3;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Clôturer la caisse</DialogTitle>
          <DialogDescription>Comptez l’argent réellement présent dans le tiroir.</DialogDescription>
        </DialogHeader>
        <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          Compter par billets et pièces
          <Switch checked={parCoupures} onCheckedChange={setParCoupures} />
        </label>
        {parCoupures ? (
          <Comptage onTotal={setCompte} />
        ) : (
          <Champ id="compte" libelle="Montant compté">
            <SaisieMontant id="compte" valeur={compte} onChange={setCompte} autoFocus />
          </Champ>
        )}
        <dl className="grid grid-cols-3 divide-x rounded-xl border text-center">
          <div className="p-3">
            <dt className="text-xs text-muted-foreground">Attendu</dt>
            <dd className="montant font-bold">{formatFCFA(theorique)}</dd>
          </div>
          <div className="p-3">
            <dt className="text-xs text-muted-foreground">Compté</dt>
            <dd className="montant font-bold">{formatFCFA(compte)}</dd>
          </div>
          <div className="p-3">
            <dt className="text-xs text-muted-foreground">Écart</dt>
            <dd
              className={cn(
                "montant font-bold",
                ecart === 0 ? "text-success" : ecart < 0 ? "text-destructive" : "text-warning",
              )}
            >
              {ecart > 0 ? "+" : ""}
              {formatFCFA(ecart)}
            </dd>
          </div>
        </dl>
        {ecart !== 0 ? (
          <Champ id="justif" libelle="Justification de l’écart (obligatoire)">
            <Textarea
              id="justif"
              rows={2}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </Champ>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={justificationManquante || cloturer.isPending}
            onClick={() =>
              cloturer
                .mutateAsync({ sessionId: session.id, compte, commentaire })
                .then((s) => {
                  toast.success(
                    s.ecart
                      ? `Caisse clôturée avec un écart de ${formatFCFA(s.ecart)}.`
                      : "Caisse clôturée sans écart.",
                  );
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            {cloturer.isPending ? <Loader2 className="animate-spin" /> : <Lock />}
            Clôturer la caisse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionEnCours({ session }: { session: SessionCaisse }) {
  const { role } = useEspace();
  const { data, isLoading, error } = useResumeSession(session);
  const [mouvement, setMouvement] = useState<"entree" | "sortie" | null>(null);
  const [cloture, setCloture] = useState(false);
  const gestion = role === "proprietaire" || role === "gerant";

  if (isLoading) return <Chargement />;
  if (error || !data)
    return (
      <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {messageErreur(error)}
      </p>
    );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 bg-primary px-5 py-5 text-primary-foreground sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-primary-foreground/75">Espèces attendues dans le tiroir</p>
            <p className="montant text-4xl font-extrabold tracking-tight">
              {formatFCFA(data.theorique)}
            </p>
            <p className="mt-1 text-xs text-primary-foreground/70">
              Ouverte le {formatDateHeure(session.ouvert_le)}
              {session.ouvreur?.nom ? ` par ${session.ouvreur.nom}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setMouvement("entree")}>
              <ArrowDownLeft />
              Entrée
            </Button>
            <Button variant="secondary" onClick={() => setMouvement("sortie")}>
              <ArrowUpRight />
              Sortie
            </Button>
            {gestion ? (
              <Button
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => setCloture(true)}
              >
                <Lock />
                Clôturer
              </Button>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y text-sm lg:grid-cols-4 lg:divide-y-0">
          {[
            ["Fond de caisse", session.fond_initial],
            ["Espèces encaissées", data.especes],
            ["Entrées", data.entrees],
            ["Sorties", -data.sorties],
          ].map(([l, v]) => (
            <div key={l} className="px-5 py-3">
              <dt className="text-xs text-muted-foreground">{l}</dt>
              <dd className="montant mt-0.5 text-lg font-bold">{formatFCFA(v as number)}</dd>
            </div>
          ))}
        </dl>
        {!gestion ? (
          <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
            La clôture est faite par le gérant ou le propriétaire.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card">
          <h2 className="border-b px-5 py-3 font-semibold">Encaissements par moyen</h2>
          {data.parMoyen.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Aucun encaissement depuis l’ouverture.
            </p>
          ) : (
            <ul className="divide-y">
              {data.parMoyen.map((m) => (
                <li key={m.moyen} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    <span className="font-medium">{LIBELLES_MOYEN[m.moyen]}</span>
                    <span className="text-muted-foreground"> · {m.nombre}</span>
                  </span>
                  <span className="text-right">
                    <span className="montant block font-semibold">{formatFCFA(m.valide)}</span>
                    {m.aVerifier ? (
                      <span className="montant block text-xs text-warning">
                        + {formatFCFA(m.aVerifier)} à vérifier
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card">
          <h2 className="border-b px-5 py-3 font-semibold">Entrées et sorties</h2>
          {data.mouvements.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Aucun mouvement.</p>
          ) : (
            <ul className="divide-y">
              {data.mouvements.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.motif}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateHeure(m.created_at)}
                      {m.profiles?.nom ? ` · ${m.profiles.nom}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "montant font-semibold",
                      m.type === "entree" ? "text-success" : "text-destructive",
                    )}
                  >
                    {m.type === "entree" ? "+" : "−"}
                    {formatFCFA(m.montant)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {mouvement ? (
        <DialogueMouvement session={session} type={mouvement} onFermer={() => setMouvement(null)} />
      ) : null}
      {cloture ? (
        <DialogueCloture
          session={session}
          theorique={data.theorique}
          onFermer={() => setCloture(false)}
        />
      ) : null}
    </div>
  );
}

function AVerifier() {
  const { boutique, role } = useEspace();
  const { data, isLoading } = usePaiementsAVerifier(boutique.id);
  const maj = useStatutPaiementCaisse();
  const gestion = role === "proprietaire" || role === "gerant";
  if (isLoading) return <Chargement />;
  if (!data?.length)
    return (
      <EtatVide
        icone={Wallet}
        titre="Aucun paiement à vérifier"
        texte="Les paiements mobile money saisis à la main apparaissent ici."
      />
    );
  const total = data.reduce((a, p) => a + p.montant, 0);
  return (
    <section className="rounded-2xl border bg-card">
      <h2 className="border-b px-5 py-3 font-semibold">
        {data.length} paiement{data.length > 1 ? "s" : ""} à vérifier ·{" "}
        <span className="montant">{formatFCFA(total)}</span>
      </h2>
      <ul className="divide-y">
        {data.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block font-medium">
                {LIBELLES_MOYEN[p.moyen]} · réf. {p.reference_operateur ?? "—"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDateHeure(p.created_at)}
                {p.depots ? (
                  <>
                    {" · "}
                    <Link to="/depots/$id" params={{ id: p.depots.id }} className="underline">
                      {p.depots.numero}
                    </Link>
                    {p.depots.clients?.nom ? ` · ${p.depots.clients.nom}` : ""}
                  </>
                ) : null}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <BadgeStatutPaiementLigne statut={p.statut} />
              <span className="montant font-semibold">{formatFCFA(p.montant)}</span>
              {gestion ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={maj.isPending}
                    onClick={() =>
                      maj
                        .mutateAsync({ id: p.id, statut: "valide" })
                        .then(() => toast.success("Paiement validé."))
                        .catch((e: unknown) => toast.error(messageErreur(e)))
                    }
                  >
                    Reçu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={maj.isPending}
                    onClick={() =>
                      maj
                        .mutateAsync({ id: p.id, statut: "annule" })
                        .then(() => toast.success("Paiement annulé."))
                        .catch((e: unknown) => toast.error(messageErreur(e)))
                    }
                  >
                    Non reçu
                  </Button>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {!gestion ? (
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
          Le gérant ou le propriétaire confirme la réception sur le téléphone de la boutique.
        </p>
      ) : null}
    </section>
  );
}

function Historique() {
  const { boutique } = useEspace();
  const { data, isLoading } = useHistoriqueCaisse(boutique.id);
  if (isLoading) return <Chargement />;
  if (!data?.length) return <EtatVide icone={Lock} titre="Aucune caisse clôturée" />;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Ouverture</th>
            <th className="px-4 py-3 font-medium">Clôture</th>
            <th className="px-4 py-3 text-right font-medium">Fond</th>
            <th className="px-4 py-3 text-right font-medium">Attendu</th>
            <th className="px-4 py-3 text-right font-medium">Compté</th>
            <th className="px-4 py-3 text-right font-medium">Écart</th>
            <th className="px-4 py-3 font-medium">Justification</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">
                {formatDateHeure(s.ouvert_le)}
                <span className="block text-xs text-muted-foreground">{s.ouvreur?.nom}</span>
              </td>
              <td className="px-4 py-3">
                {formatDateHeure(s.cloture_le)}
                <span className="block text-xs text-muted-foreground">{s.clotureur?.nom}</span>
              </td>
              <td className="montant px-4 py-3 text-right">{formatFCFA(s.fond_initial)}</td>
              <td className="montant px-4 py-3 text-right">{formatFCFA(s.montant_theorique)}</td>
              <td className="montant px-4 py-3 text-right">{formatFCFA(s.montant_compte)}</td>
              <td
                className={cn(
                  "montant px-4 py-3 text-right font-semibold",
                  !s.ecart ? "text-success" : s.ecart < 0 ? "text-destructive" : "text-warning",
                )}
              >
                {s.ecart && s.ecart > 0 ? "+" : ""}
                {formatFCFA(s.ecart)}
              </td>
              <td className="max-w-[240px] px-4 py-3 text-muted-foreground">
                {s.commentaire ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaissePage() {
  const { boutique } = useEspace();
  const { data: session, isLoading, error } = useSessionOuverte(boutique.id);
  const aVerifier = usePaiementsAVerifier(boutique.id);
  const nb = aVerifier.data?.length ?? 0;

  return (
    <>
      <PageHeader titre="Caisse" description={boutique.nom} />
      <Tabs defaultValue="session">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="verifier">À vérifier{nb ? ` (${nb})` : ""}</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>
        <TabsContent value="session">
          {isLoading ? <Chargement /> : null}
          {error ? (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {messageErreur(error)}
            </p>
          ) : null}
          {!isLoading && !error ? (
            session ? (
              <SessionEnCours session={session} />
            ) : (
              <OuvertureCaisse />
            )
          ) : null}
        </TabsContent>
        <TabsContent value="verifier">
          <AVerifier />
        </TabsContent>
        <TabsContent value="historique">
          <Historique />
        </TabsContent>
      </Tabs>
    </>
  );
}
