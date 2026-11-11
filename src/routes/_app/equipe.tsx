import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspace } from "@/contexts/SessionContext";
import {
  useActiviteMois,
  useAjouterAvance,
  useAjouterMembre,
  useAvances,
  useEmployes,
  useEnregistrerEmploye,
  useEnregistrerSalaire,
  useMembres,
  useModifierMembre,
  usePayerSalaire,
  usePointagesMois,
  usePointerPour,
  useSalairesMois,
  type Employe,
  type Membre,
} from "@/hooks/useEquipe";
import { messageErreur } from "@/lib/erreurs";
import { imprimerFichePaie } from "@/lib/export";
import { formatDate, formatFCFA, formatTelephone, toISODate } from "@/lib/format";
import {
  calculerSalaire,
  LIBELLES_REMUNERATION,
  libelleMois,
  netSalaire,
  type TypeRemuneration,
} from "@/lib/salaire";
import { LIBELLES_MOYEN, LIBELLES_ROLE, type MoyenPaiement, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/equipe")({
  head: () => ({ meta: [{ title: "Équipe — PREX’ING" }] }),
  component: EquipePage,
});

const ROLES_INVITABLES: Role[] = ["gerant", "caissier", "livreur"];
const moisCourant = () => toISODate(new Date()).slice(0, 7);
const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/* ---------------- Membres ---------------- */

function DialogueMembre({ membre, onFermer }: { membre: Membre | null; onFermer: () => void }) {
  const { pressing, boutiques } = useEspace();
  const ajouter = useAjouterMembre(pressing.id);
  const modifier = useModifierMembre();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(membre?.role ?? "caissier");
  const [plafond, setPlafond] = useState(String(membre?.plafond_remise_pct ?? 5));
  const [actif, setActif] = useState(membre?.actif ?? true);
  const [toutes, setToutes] = useState(!membre?.boutique_ids);
  const [choix, setChoix] = useState<string[]>(membre?.boutique_ids ?? []);
  const enCours = ajouter.isPending || modifier.isPending;
  const boutiqueIds = toutes ? null : choix;
  const valide = (membre || /^\S+@\S+\.\S+$/.test(email.trim())) && (toutes || choix.length > 0);

  function valider() {
    const plafondN = Math.min(100, Math.max(0, Number(plafond.replace(",", ".")) || 0));
    const p = membre
      ? modifier.mutateAsync({ id: membre.id, role, plafond: plafondN, actif, boutiqueIds })
      : ajouter.mutateAsync({ email, role, plafond: plafondN, boutiqueIds });
    p.then(() => {
      toast.success(
        membre ? "Accès modifié." : "Membre ajouté : il peut se connecter dès maintenant.",
      );
      onFermer();
    }).catch((e: unknown) => toast.error(messageErreur(e)));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {membre ? `Accès de ${membre.profiles?.nom ?? "ce membre"}` : "Ajouter un membre"}
          </DialogTitle>
          <DialogDescription>
            {membre
              ? "Rôle, plafond de remise et boutiques autorisées."
              : "L’employé crée d’abord son compte sur la page Inscription, puis vous l’ajoutez avec son email."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!membre ? (
            <Champ id="mb-email" libelle="Email de son compte">
              <Input
                id="mb-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoFocus
              />
            </Champ>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rôle">
            {ROLES_INVITABLES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "h-10 rounded-lg border px-4 text-sm font-medium",
                  role === r ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {LIBELLES_ROLE[r]}
              </button>
            ))}
          </div>
          {role !== "livreur" ? (
            <Champ
              id="mb-plafond"
              libelle="Plafond de remise (%)"
              aide="Au-delà, la remise est bloquée au comptoir."
            >
              <Input
                id="mb-plafond"
                inputMode="decimal"
                value={plafond}
                onChange={(e) => setPlafond(e.target.value)}
                className="h-11 w-32 text-right"
              />
            </Champ>
          ) : null}
          {boutiques.length > 1 ? (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm">
                Toutes les boutiques
                <Switch checked={toutes} onCheckedChange={setToutes} />
              </label>
              {!toutes
                ? boutiques.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={choix.includes(b.id)}
                        onChange={(e) =>
                          setChoix((c) =>
                            e.target.checked ? [...c, b.id] : c.filter((x) => x !== b.id),
                          )
                        }
                        className="size-4"
                      />
                      {b.nom}
                    </label>
                  ))
                : null}
            </div>
          ) : null}
          {membre ? (
            <label className="flex items-center justify-between text-sm">
              Accès actif
              <Switch checked={actif} onCheckedChange={setActif} />
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button disabled={!valide || enCours} onClick={valider}>
            {enCours ? <Loader2 className="animate-spin" /> : null}
            {membre ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Membres() {
  const { pressing, user } = useEspace();
  const { data, isLoading } = useMembres(pressing.id);
  const [dialogue, setDialogue] = useState<Membre | "nouveau" | null>(null);
  return (
    <div className="space-y-3">
      <Button onClick={() => setDialogue("nouveau")}>
        <UserPlus />
        Ajouter un membre
      </Button>
      {isLoading ? (
        <Chargement />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {(data ?? []).map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                !m.actif && "opacity-60",
              )}
            >
              <div>
                <p className="font-medium">
                  {m.profiles?.nom ?? "—"}
                  {m.user_id === user.id ? " (vous)" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {LIBELLES_ROLE[m.role]}
                  {m.role !== "proprietaire" && m.role !== "livreur"
                    ? ` · remise max ${m.plafond_remise_pct} %`
                    : ""}
                  {m.profiles?.telephone ? ` · ${formatTelephone(m.profiles.telephone)}` : ""}
                  {!m.actif ? " · accès désactivé" : ""}
                </p>
              </div>
              {m.role !== "proprietaire" ? (
                <Button size="sm" variant="outline" onClick={() => setDialogue(m)}>
                  <Pencil />
                  Modifier
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {dialogue ? (
        <DialogueMembre
          membre={dialogue === "nouveau" ? null : dialogue}
          onFermer={() => setDialogue(null)}
        />
      ) : null}
    </div>
  );
}

/* ---------------- Employés ---------------- */

function DialogueEmploye({ employe, onFermer }: { employe: Employe | null; onFermer: () => void }) {
  const { pressing, boutiques } = useEspace();
  const enregistrer = useEnregistrerEmploye(pressing.id);
  const [nom, setNom] = useState(employe?.nom ?? "");
  const [telephone, setTelephone] = useState(employe?.telephone ?? "");
  const [poste, setPoste] = useState(employe?.poste ?? "");
  const [boutique, setBoutique] = useState(employe?.boutique_id ?? boutiques[0]?.id ?? "");
  const [embauche, setEmbauche] = useState(employe?.date_embauche ?? toISODate(new Date()));
  const [type, setType] = useState<TypeRemuneration>(employe?.type_remuneration ?? "mensuel");
  const [base, setBase] = useState(employe?.montant_base ?? 0);
  const [actif, setActif] = useState(employe?.actif ?? true);
  const libelleBase: Record<TypeRemuneration, string> = {
    mensuel: "Salaire mensuel",
    journalier: "Montant par jour",
    piece: "Montant par pièce",
    commission: "Pourcentage des encaissements",
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employe ? "Modifier l’employé" : "Nouvel employé"}</DialogTitle>
          <DialogDescription>
            Fiche utilisée pour le pointage et le calcul du salaire.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Champ id="em-nom" libelle="Nom">
              <Input
                id="em-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="h-11"
                autoFocus
              />
            </Champ>
            <Champ id="em-tel" libelle="Téléphone">
              <Input
                id="em-tel"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="h-11"
              />
            </Champ>
            <Champ id="em-poste" libelle="Poste">
              <Input
                id="em-poste"
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                placeholder="Repasseur, laveur…"
                className="h-11"
              />
            </Champ>
            <Champ id="em-emb" libelle="Date d’embauche">
              <Input
                id="em-emb"
                type="date"
                value={embauche}
                onChange={(e) => setEmbauche(e.target.value)}
                className="h-11"
              />
            </Champ>
          </div>
          {boutiques.length > 1 ? (
            <Champ id="em-bo" libelle="Boutique">
              <Select value={boutique} onValueChange={setBoutique}>
                <SelectTrigger id="em-bo" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boutiques.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Champ>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rémunération">
            {(Object.keys(LIBELLES_REMUNERATION) as TypeRemuneration[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-sm font-medium",
                  type === t ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {LIBELLES_REMUNERATION[t]}
              </button>
            ))}
          </div>
          <Champ id="em-base" libelle={libelleBase[type]}>
            {type === "commission" ? (
              <Input
                id="em-base"
                inputMode="numeric"
                value={base ? String(base) : ""}
                onChange={(e) => setBase(Number(e.target.value.replace(/\D/g, "")) || 0)}
                className="h-11 w-32 text-right"
              />
            ) : (
              <SaisieMontant id="em-base" valeur={base} onChange={setBase} />
            )}
          </Champ>
          {employe ? (
            <label className="flex items-center justify-between text-sm">
              Employé actif
              <Switch checked={actif} onCheckedChange={setActif} />
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={nom.trim().length < 2 || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({
                  id: employe?.id,
                  nom: nom.trim(),
                  telephone: telephone.replace(/\D/g, "") || null,
                  poste: poste.trim() || null,
                  boutique_id: boutique || null,
                  date_embauche: embauche || null,
                  type_remuneration: type,
                  montant_base: base,
                  actif,
                })
                .then(() => {
                  toast.success("Fiche employé enregistrée.");
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

function Employes() {
  const { pressing } = useEspace();
  const { data, isLoading } = useEmployes(pressing.id);
  const [dialogue, setDialogue] = useState<Employe | "nouveau" | null>(null);
  return (
    <div className="space-y-3">
      <Button onClick={() => setDialogue("nouveau")}>
        <Plus />
        Nouvel employé
      </Button>
      {isLoading ? (
        <Chargement />
      ) : !data?.length ? (
        <EtatVide
          icone={UsersRound}
          titre="Aucun employé"
          texte="Les membres ajoutés à l’application ont automatiquement leur fiche."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((e) => (
            <li
              key={e.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                !e.actif && "opacity-60",
              )}
            >
              <div>
                <p className="font-medium">
                  {e.nom}
                  {e.user_id ? (
                    <span className="ml-2 rounded-full bg-info/15 px-2 py-0.5 text-xs text-info">
                      utilise l’application
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.poste ?? "—"} · {LIBELLES_REMUNERATION[e.type_remuneration]} :{" "}
                  {e.type_remuneration === "commission"
                    ? `${e.montant_base} %`
                    : formatFCFA(e.montant_base)}
                  {e.date_embauche ? ` · depuis le ${formatDate(e.date_embauche)}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setDialogue(e)}>
                <Pencil />
                Modifier
              </Button>
            </li>
          ))}
        </ul>
      )}
      {dialogue ? (
        <DialogueEmploye
          employe={dialogue === "nouveau" ? null : dialogue}
          onFermer={() => setDialogue(null)}
        />
      ) : null}
    </div>
  );
}

/* ---------------- Pointage ---------------- */

function Pointages() {
  const { pressing } = useEspace();
  const employes = (useEmployes(pressing.id).data ?? []).filter((e) => e.actif);
  const { data: pointages = [] } = usePointagesMois(pressing.id, moisCourant());
  const pointer = usePointerPour(pressing.id);
  const auj = toISODate(new Date());
  const duJour = (id: string) =>
    pointages.filter((p) => p.employe_id === id && toISODate(new Date(p.arrivee)) === auj);
  const action = (p: Parameters<typeof pointer.mutateAsync>[0], msg: string) =>
    pointer
      .mutateAsync(p)
      .then(() => toast.success(msg))
      .catch((e: unknown) => toast.error(messageErreur(e)));

  if (!employes.length) return <EtatVide icone={UsersRound} titre="Aucun employé actif" />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Aujourd’hui, {formatDate(auj)}. Les employés qui utilisent l’application peuvent aussi
        pointer eux-mêmes depuis leur tableau de bord.
      </p>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {employes.map((e) => {
          const j = duJour(e.id);
          const ouvert = j.find((p) => p.type === "presence" && !p.depart);
          const absent = j.find((p) => p.type !== "presence");
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{e.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {absent
                    ? absent.type === "absence"
                      ? "Absent"
                      : "En congé"
                    : j.length
                      ? j
                          .filter((p) => p.type === "presence")
                          .map((p) => `${heure(p.arrivee)} → ${p.depart ? heure(p.depart) : "…"}`)
                          .join(", ")
                      : "Pas encore pointé"}
                </p>
              </div>
              {!absent ? (
                <div className="flex flex-wrap gap-2">
                  {ouvert ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pointer.isPending}
                      onClick={() =>
                        void action(
                          { employeId: e.id, action: "depart", pointageId: ouvert.id },
                          `Départ de ${e.nom} enregistré.`,
                        )
                      }
                    >
                      <LogOut />
                      Départ
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pointer.isPending}
                      onClick={() =>
                        void action(
                          { employeId: e.id, action: "arrivee" },
                          `Arrivée de ${e.nom} enregistrée.`,
                        )
                      }
                    >
                      <LogIn />
                      Arrivée
                    </Button>
                  )}
                  {!j.length ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pointer.isPending}
                        onClick={() =>
                          void action(
                            { employeId: e.id, action: "absence", date: auj },
                            `${e.nom} : absence enregistrée.`,
                          )
                        }
                      >
                        Absent
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pointer.isPending}
                        onClick={() =>
                          void action(
                            { employeId: e.id, action: "conge", date: auj },
                            `${e.nom} : congé enregistré.`,
                          )
                        }
                      >
                        Congé
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Salaires ---------------- */

function LigneSalaire({ employe, mois }: { employe: Employe; mois: string }) {
  const { pressing, boutiques } = useEspace();
  const employes = useMemo(() => [employe], [employe]);
  const activite = useActiviteMois(pressing.id, mois, employes).data?.get(employe.id);
  const { data: avances = [] } = useAvances(pressing.id);
  const salaire = (useSalairesMois(pressing.id, mois).data ?? []).find(
    (s) => s.employe_id === employe.id,
  );
  const enregistrer = useEnregistrerSalaire(pressing.id);
  const payer = usePayerSalaire();
  const [primes, setPrimes] = useState<number | null>(null);
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const finMois = useMemo(() => {
    const [a, m] = mois.split("-").map(Number);
    return toISODate(new Date(a ?? 2026, m ?? 1, 1));
  }, [mois]);
  const avancesDues = avances
    .filter((a) => a.employe_id === employe.id && !a.deduite_salaire_id && a.date < finMois)
    .reduce((t, a) => t + a.montant, 0);
  if (!activite)
    return <li className="px-4 py-3 text-sm text-muted-foreground">{employe.nom} : calcul…</li>;
  const calc = calculerSalaire(
    employe.type_remuneration,
    employe.montant_base,
    activite,
    avancesDues,
  );
  const paye = Boolean(salaire?.paye_le);
  const base = paye ? salaire!.base : calc.base;
  const retenues = paye ? salaire!.retenues : calc.retenues;
  const av = paye ? salaire!.avances : calc.avances;
  const pr = primes ?? salaire?.primes ?? 0;
  const net = netSalaire(base, pr, retenues, av);

  async function enregistrerPuisPayer() {
    try {
      await enregistrer.mutateAsync({
        id: salaire?.id,
        employeId: employe.id,
        mois,
        base,
        primes: pr,
        retenues,
        avances: av,
      });
      toast.success(`Salaire de ${employe.nom} enregistré : ${formatFCFA(net)}.`);
    } catch (e) {
      toast.error(messageErreur(e));
    }
  }

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {employe.nom}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            · {LIBELLES_REMUNERATION[employe.type_remuneration]} · {calc.detail}
          </span>
        </p>
        <p className="montant text-lg font-bold">{formatFCFA(net)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Base</p>
          <p className="montant font-semibold">{formatFCFA(base)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Retenues (absences)</p>
          <p className="montant font-semibold">−{formatFCFA(retenues)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Avances</p>
          <p className="montant font-semibold">−{formatFCFA(av)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Primes</p>
          {paye ? (
            <p className="montant font-semibold">+{formatFCFA(pr)}</p>
          ) : (
            <SaisieMontant
              id={`pr-${employe.id}`}
              valeur={pr}
              onChange={setPrimes}
              className="h-8 text-sm"
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {paye ? (
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
            Payé le {formatDate(salaire!.paye_le)}
            {salaire!.moyen ? ` · ${LIBELLES_MOYEN[salaire!.moyen]}` : ""}
          </span>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={enregistrer.isPending}
              onClick={() => void enregistrerPuisPayer()}
            >
              {salaire ? "Mettre à jour" : "Enregistrer"}
            </Button>
            {salaire ? (
              <>
                <Select value={moyen} onValueChange={(v) => setMoyen(v as MoyenPaiement)}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOYENS_COMPTOIR.map((m) => (
                      <SelectItem key={m} value={m}>
                        {LIBELLES_MOYEN[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={payer.isPending || net !== salaire.net}
                  title={net !== salaire.net ? "Enregistrez d’abord le montant modifié" : undefined}
                  onClick={() =>
                    payer
                      .mutateAsync({ salaireId: salaire.id, moyen })
                      .then(() =>
                        toast.success(
                          moyen === "especes"
                            ? "Salaire payé ; la somme est sortie de la caisse ouverte."
                            : "Salaire payé.",
                        ),
                      )
                      .catch((e: unknown) => toast.error(messageErreur(e)))
                  }
                >
                  <Wallet />
                  Payer {formatFCFA(salaire.net)}
                </Button>
              </>
            ) : null}
          </>
        )}
        {salaire ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              imprimerFichePaie({
                pressing: pressing.nom,
                boutique:
                  boutiques.find((b) => b.id === employe.boutique_id)?.nom ??
                  boutiques[0]?.nom ??
                  "",
                employe: employe.nom,
                poste: employe.poste,
                mois: libelleMois(mois),
                detail: calc.detail,
                lignes: [
                  ["Salaire de base", salaire.base],
                  ["Primes", salaire.primes],
                  ["Retenues (absences)", -salaire.retenues],
                  ["Avances déduites", -salaire.avances],
                ],
                net: salaire.net,
                paye: salaire.paye_le
                  ? `Payé le ${formatDate(salaire.paye_le)}${salaire.moyen ? ` par ${LIBELLES_MOYEN[salaire.moyen]}` : ""}`
                  : null,
              })
            }
          >
            <FileText />
            Fiche de paie
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Salaires() {
  const { pressing } = useEspace();
  const [mois, setMois] = useState(moisCourant());
  const employes = (useEmployes(pressing.id).data ?? []).filter((e) => e.actif);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="month"
          value={mois}
          max={moisCourant()}
          onChange={(e) => e.target.value && setMois(e.target.value)}
          className="h-10 w-48"
          aria-label="Mois"
        />
        <span className="text-sm text-muted-foreground">{libelleMois(mois)}</span>
      </div>
      {!employes.length ? (
        <EtatVide icone={Wallet} titre="Aucun employé actif" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {employes.map((e) => (
            <LigneSalaire key={`${e.id}-${mois}`} employe={e} mois={mois} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Calcul simplifié sans CNPS ni impôt sur salaire : la fiche donne les chiffres pour les
        déclarer.
      </p>
    </div>
  );
}

/* ---------------- Avances ---------------- */

function Avances() {
  const { pressing } = useEspace();
  const employes = (useEmployes(pressing.id).data ?? []).filter((e) => e.actif);
  const { data: avances = [] } = useAvances(pressing.id);
  const ajouter = useAjouterAvance(pressing.id);
  const [employe, setEmploye] = useState("");
  const [montant, setMontant] = useState(0);
  const [note, setNote] = useState("");
  const nom = (id: string) => employes.find((e) => e.id === id)?.nom ?? "—";
  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_160px_1fr_auto] sm:items-end">
        <Champ id="av-em" libelle="Employé">
          <Select value={employe} onValueChange={setEmploye}>
            <SelectTrigger id="av-em" className="h-10">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {employes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>
        <Champ id="av-m" libelle="Montant">
          <SaisieMontant id="av-m" valeur={montant} onChange={setMontant} className="h-10" />
        </Champ>
        <Champ id="av-n" libelle="Note">
          <Input
            id="av-n"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10"
          />
        </Champ>
        <Button
          className="h-10"
          disabled={!employe || montant <= 0 || ajouter.isPending}
          onClick={() =>
            ajouter
              .mutateAsync({ employeId: employe, montant, date: toISODate(new Date()), note })
              .then(() => {
                toast.success(`Avance de ${formatFCFA(montant)} enregistrée.`);
                setMontant(0);
                setNote("");
              })
              .catch((e: unknown) => toast.error(messageErreur(e)))
          }
        >
          <Plus />
          Ajouter
        </Button>
      </div>
      {avances.length ? (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {avances.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">{nom(a.employe_id)}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(a.date)}
                  {a.note ? ` · ${a.note}` : ""} ·{" "}
                  {a.deduite_salaire_id ? "déduite du salaire" : "à déduire"}
                </span>
              </span>
              <span className="montant font-semibold">{formatFCFA(a.montant)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EtatVide icone={Wallet} titre="Aucune avance" />
      )}
      <p className="text-xs text-muted-foreground">
        L’avance n’est pas sortie de la caisse automatiquement : si vous la donnez en espèces,
        enregistrez une sortie dans Caisse.
      </p>
    </div>
  );
}

function EquipePage() {
  return (
    <>
      <PageHeader
        titre="Équipe"
        description="Accès à l’application, employés, pointage et salaires."
      />
      <Tabs defaultValue="membres">
        <TabsList className="mb-4 h-10 flex-wrap">
          <TabsTrigger value="membres">Accès</TabsTrigger>
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="pointage">Pointage</TabsTrigger>
          <TabsTrigger value="salaires">Salaires</TabsTrigger>
          <TabsTrigger value="avances">Avances</TabsTrigger>
        </TabsList>
        <TabsContent value="membres">
          <Membres />
        </TabsContent>
        <TabsContent value="employes">
          <Employes />
        </TabsContent>
        <TabsContent value="pointage">
          <Pointages />
        </TabsContent>
        <TabsContent value="salaires">
          <Salaires />
        </TabsContent>
        <TabsContent value="avances">
          <Avances />
        </TabsContent>
      </Tabs>
    </>
  );
}
