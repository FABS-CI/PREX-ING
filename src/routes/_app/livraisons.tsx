import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ban,
  CheckCheck,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Trash2,
  Truck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { EtatVide } from "@/components/common/EtatVide";
import { PageHeader } from "@/components/common/PageHeader";
import { SaisieMontant } from "@/components/common/SaisieMontant";
import {
  DialogueCourse,
  DialogueEchec,
  DialogueTerminer,
  messageCode,
} from "@/components/livraisons/Dialogues";
import { Button } from "@/components/ui/button";
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
  LIBELLES_STATUT_LIVRAISON,
  lienItineraire,
  useAffecterLivreur,
  useAvancerCourse,
  useCourses,
  useEnregistrerZone,
  useLivreurs,
  useMaTournee,
  useSupprimerZone,
  useZones,
  type Course,
  type StatutLivraison,
} from "@/hooks/useLivraisons";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatFCFA, lienWhatsApp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/livraisons")({
  head: () => ({ meta: [{ title: "Livraisons — PREX’ING" }] }),
  component: LivraisonsPage,
});

const COULEURS: Record<StatutLivraison, string> = {
  demande: "bg-muted text-muted-foreground",
  planifie: "bg-info/15 text-info",
  en_cours: "bg-warning/15 text-warning",
  effectue: "bg-success/15 text-success",
  echoue: "bg-destructive/10 text-destructive",
  annule: "bg-muted text-muted-foreground line-through",
};

const heure = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
const creneau = (c: Course) =>
  c.creneau_debut
    ? `${formatDate(c.creneau_debut)} · ${heure(c.creneau_debut)} – ${heure(c.creneau_fin)}`
    : "Sans créneau";

type Action = { course: Course; quoi: "terminer" | "echec" | "annuler" } | null;

function CarteCourse({
  c,
  vueLivreur,
  onAction,
}: {
  c: Course;
  vueLivreur: boolean;
  onAction: (a: Action) => void;
}) {
  const { pressing, boutique } = useEspace();
  const { data: livreurs = [] } = useLivreurs(pressing.id);
  const affecter = useAffecterLivreur();
  const avancer = useAvancerCourse();
  const actif =
    c.statut === "planifie" ||
    c.statut === "en_cours" ||
    c.statut === "demande" ||
    c.statut === "echoue";
  return (
    <li className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                c.type === "livraison"
                  ? "bg-primary/10 text-primary dark:text-info"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {c.type === "livraison" ? "Livraison" : "Ramassage"}
            </span>
            {c.clients?.nom}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {c.adresse}
            {c.repere ? ` · ${c.repere}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {creneau(c)}
            {c.zones_livraison ? ` · ${c.zones_livraison.nom}` : ""}
            {c.frais ? ` · frais ${formatFCFA(c.frais)}` : ""}
            {c.depots ? (
              <>
                {" "}
                ·{" "}
                <Link to="/depots/$id" params={{ id: c.depot_id! }} className="underline">
                  {c.depots.numero}
                </Link>
              </>
            ) : null}
          </p>
          {c.statut === "echoue" && c.motif_echec ? (
            <p className="mt-1 text-sm text-destructive">Échec : {c.motif_echec}</p>
          ) : null}
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", COULEURS[c.statut])}>
          {LIBELLES_STATUT_LIVRAISON[c.statut]}
        </span>
      </div>

      {c.type === "livraison" && c.depots && c.depots.reste_a_payer > 0 && actif ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm">
          À encaisser à la remise :{" "}
          <strong className="montant">{formatFCFA(c.depots.reste_a_payer)}</strong>
        </p>
      ) : null}

      {actif ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={lienItineraire(c.adresse)} target="_blank" rel="noreferrer">
              <Navigation />
              Itinéraire
            </a>
          </Button>
          {c.clients?.telephone ? (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${c.clients.telephone}`}>
                <Phone />
                Appeler
              </a>
            </Button>
          ) : null}
          {!vueLivreur && c.code_confirmation && c.clients ? (
            <Button asChild size="sm" variant="ghost">
              <a
                href={lienWhatsApp(
                  c.clients.telephone,
                  messageCode(c.clients.nom, c.code_confirmation, c.type, boutique.nom),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                Code {c.code_confirmation}
              </a>
            </Button>
          ) : null}
          {!vueLivreur ? (
            <Select
              value={c.livreur_id ?? "aucun"}
              onValueChange={(v) =>
                affecter
                  .mutateAsync({ id: c.id, livreurId: v === "aucun" ? null : v })
                  .then(() => toast.success(v === "aucun" ? "Livreur retiré." : "Course affectée."))
                  .catch((e: unknown) => toast.error(messageErreur(e)))
              }
            >
              <SelectTrigger className="h-8 w-[170px]" aria-label="Livreur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Sans livreur</SelectItem>
                {livreurs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {(c.statut === "planifie" || c.statut === "echoue") && c.livreur_id ? (
              <Button
                size="sm"
                variant="outline"
                disabled={avancer.isPending}
                onClick={() =>
                  avancer
                    .mutateAsync({ id: c.id, statut: "en_cours" })
                    .then(() => toast.success("Course démarrée."))
                    .catch((e: unknown) => toast.error(messageErreur(e)))
                }
              >
                <Truck />
                Démarrer
              </Button>
            ) : null}
            {c.statut === "en_cours" || (!vueLivreur && c.statut !== "demande") ? (
              <Button
                size="sm"
                className="bg-success text-success-foreground hover:bg-success/90"
                onClick={() => onAction({ course: c, quoi: "terminer" })}
              >
                <CheckCheck />
                {c.type === "livraison" ? "Livré" : "Récupéré"}
              </Button>
            ) : null}
            {c.statut === "en_cours" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => onAction({ course: c, quoi: "echec" })}
              >
                <TriangleAlert />
                Échec
              </Button>
            ) : null}
            {!vueLivreur ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => onAction({ course: c, quoi: "annuler" })}
              >
                <Ban />
                Annuler
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Zones() {
  const { pressing, role } = useEspace();
  const { data: zones = [] } = useZones(pressing.id);
  const enregistrer = useEnregistrerZone(pressing.id);
  const supprimer = useSupprimerZone(pressing.id);
  const [nom, setNom] = useState("");
  const [communes, setCommunes] = useState("");
  const [frais, setFrais] = useState(0);
  const [seuil, setSeuil] = useState(0);
  const gestion = role === "proprietaire" || role === "gerant";
  return (
    <div className="space-y-4">
      {gestion ? (
        <div className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_1.4fr_130px_150px_auto] sm:items-end">
          <Champ id="z-nom" libelle="Zone">
            <Input
              id="z-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Cocody"
              className="h-10"
            />
          </Champ>
          <Champ id="z-com" libelle="Quartiers / communes">
            <Input
              id="z-com"
              value={communes}
              onChange={(e) => setCommunes(e.target.value)}
              placeholder="Angré, Riviera, II Plateaux"
              className="h-10"
            />
          </Champ>
          <Champ id="z-frais" libelle="Frais">
            <SaisieMontant id="z-frais" valeur={frais} onChange={setFrais} className="h-10" />
          </Champ>
          <Champ id="z-seuil" libelle="Offerts dès">
            <SaisieMontant id="z-seuil" valeur={seuil} onChange={setSeuil} className="h-10" />
          </Champ>
          <Button
            className="h-10"
            disabled={nom.trim().length < 2 || enregistrer.isPending}
            onClick={() =>
              enregistrer
                .mutateAsync({
                  nom,
                  communes: communes
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  frais,
                  seuil: seuil || null,
                })
                .then(() => {
                  toast.success("Zone ajoutée.");
                  setNom("");
                  setCommunes("");
                  setFrais(0);
                  setSeuil(0);
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            <Plus />
            Ajouter
          </Button>
        </div>
      ) : null}
      {zones.length === 0 ? (
        <EtatVide
          icone={MapPin}
          titre="Aucune zone de livraison"
          texte="Exemple : Cocody, 1 000 FCFA, offerte dès 15 000 FCFA."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">{z.nom}</span>
                {z.communes.length ? (
                  <span className="block text-xs text-muted-foreground">
                    {z.communes.join(", ")}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-right">
                  <span className="montant block font-semibold">{formatFCFA(z.frais)}</span>
                  {z.seuil_gratuite ? (
                    <span className="montant block text-xs text-muted-foreground">
                      offerts dès {formatFCFA(z.seuil_gratuite)}
                    </span>
                  ) : null}
                </span>
                {gestion ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Supprimer la zone ${z.nom}`}
                    onClick={() => supprimer.mutate(z.id)}
                  >
                    <Trash2 />
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

function ListeCourses({
  courses,
  vueLivreur,
  vide,
}: {
  courses: Course[] | undefined;
  vueLivreur: boolean;
  vide: string;
}) {
  const [action, setAction] = useState<Action>(null);
  if (!courses) return <Chargement />;
  if (!courses.length) return <EtatVide icone={Truck} titre={vide} />;
  return (
    <>
      <ul className="space-y-3">
        {courses.map((c) => (
          <CarteCourse key={c.id} c={c} vueLivreur={vueLivreur} onAction={setAction} />
        ))}
      </ul>
      {action?.quoi === "terminer" ? (
        <DialogueTerminer course={action.course} onFermer={() => setAction(null)} />
      ) : null}
      {action?.quoi === "echec" ? (
        <DialogueEchec course={action.course} onFermer={() => setAction(null)} />
      ) : null}
      {action?.quoi === "annuler" ? (
        <DialogueEchec course={action.course} annulation onFermer={() => setAction(null)} />
      ) : null}
    </>
  );
}

function VueLivreur() {
  const { user, profil } = useEspace();
  const { data, error } = useMaTournee(user.id);
  return (
    <>
      <PageHeader
        titre="Ma tournée"
        description={
          profil?.nom
            ? `Bonjour ${profil.nom.split(" ")[0]} · ${data?.length ?? 0} course(s)`
            : undefined
        }
      />
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {messageErreur(error)}
        </p>
      ) : null}
      <ListeCourses courses={data} vueLivreur vide="Aucune course pour le moment" />
    </>
  );
}

function VueComptoir() {
  const { boutique } = useEspace();
  const enCours = useCourses(boutique.id, false);
  const terminees = useCourses(boutique.id, true);
  const [ramassage, setRamassage] = useState(false);
  return (
    <>
      <PageHeader
        titre="Livraisons"
        description={boutique.nom}
        actions={
          <Button className="h-10" onClick={() => setRamassage(true)}>
            <Plus />
            Nouveau ramassage
          </Button>
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Pour livrer un dépôt prêt, ouvrez sa fiche et choisissez « Programmer une livraison ».
      </p>
      <Tabs defaultValue="courses">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="courses">
            À faire{enCours.data?.length ? ` (${enCours.data.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="terminees">Terminées</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
          <ListeCourses courses={enCours.data} vueLivreur={false} vide="Aucune course à faire" />
        </TabsContent>
        <TabsContent value="terminees">
          <ListeCourses
            courses={terminees.data}
            vueLivreur={false}
            vide="Aucune course terminée ces 7 derniers jours"
          />
        </TabsContent>
        <TabsContent value="zones">
          <Zones />
        </TabsContent>
      </Tabs>
      {ramassage ? <DialogueCourse type="ramassage" onFermer={() => setRamassage(false)} /> : null}
    </>
  );
}

function LivraisonsPage() {
  const { role } = useEspace();
  return role === "livreur" ? <VueLivreur /> : <VueComptoir />;
}
