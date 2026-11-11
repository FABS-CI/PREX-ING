import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ClientDialog } from "@/components/clients/ClientForm";
import { Champ } from "@/components/common/Champ";
import { SaisieMontant } from "@/components/common/SaisieMontant";
import { ChoixClient, type ClientChoisi } from "@/components/comptoir/ChoixClient";
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
import { Textarea } from "@/components/ui/textarea";
import { useEspace } from "@/contexts/SessionContext";
import {
  fraisPour,
  useAvancerCourse,
  useCreerCourse,
  useLivreurs,
  useTerminerCourse,
  useZones,
  type Course,
  type TypeLivraison,
} from "@/hooks/useLivraisons";
import { messageErreur } from "@/lib/erreurs";
import { formatFCFA, lienWhatsApp, toISODate } from "@/lib/format";
import { LIBELLES_MOYEN, type MoyenPaiement } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CRENEAUX = [
  { id: "matin", libelle: "Matin (8 h – 12 h)", debut: 8, fin: 12 },
  { id: "apres_midi", libelle: "Après-midi (12 h – 16 h)", debut: 12, fin: 16 },
  { id: "soir", libelle: "Soir (16 h – 19 h)", debut: 16, fin: 19 },
];

export function messageCode(
  nomClient: string,
  code: string,
  type: TypeLivraison,
  boutique: string,
): string {
  return `Bonjour ${nomClient}, votre ${type === "livraison" ? "livraison" : "ramassage"} ${boutique} est programmé. Donnez ce code au livreur : ${code}.`;
}

export function DialogueCourse({
  type,
  depot,
  clientInitial,
  onFermer,
}: {
  type: TypeLivraison;
  depot?: { id: string; numero: string; net_a_payer: number } | undefined;
  clientInitial?:
    | (ClientChoisi & {
        adresse?: string | null;
        quartier?: string | null;
        consentement_messages?: boolean;
      })
    | undefined;
  onFermer: () => void;
}) {
  const { pressing, boutique, role } = useEspace();
  const { data: zones = [] } = useZones(pressing.id);
  const { data: livreurs = [] } = useLivreurs(pressing.id);
  const creer = useCreerCourse();
  const [client, setClient] = useState<ClientChoisi | null>(clientInitial ?? null);
  const [nouveauClient, setNouveauClient] = useState<string | null>(null);
  const [adresse, setAdresse] = useState(
    [clientInitial?.quartier, clientInitial?.adresse].filter(Boolean).join(", "),
  );
  const [repere, setRepere] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [jour, setJour] = useState(toISODate(new Date()));
  const [creneau, setCreneau] = useState("apres_midi");
  const [livreur, setLivreur] = useState("aucun");
  const [code, setCode] = useState<string | null>(null);
  const zone = zones.find((z) => z.id === zoneId);
  const frais =
    type === "livraison" ? fraisPour(zone, depot?.net_a_payer ?? 0) : (zone?.frais ?? 0);
  const valide = Boolean(client) && adresse.trim().length >= 3;

  function valider() {
    if (!client) return;
    const c = CRENEAUX.find((x) => x.id === creneau) ?? CRENEAUX[1]!;
    const [a, m, j] = jour.split("-").map(Number);
    creer
      .mutateAsync({
        pressingId: pressing.id,
        boutiqueId: boutique.id,
        clientId: client.id,
        type,
        depotId: depot?.id ?? null,
        adresse,
        repere,
        zone,
        frais,
        creneauDebut: new Date(a ?? 2026, (m ?? 1) - 1, j ?? 1, c.debut),
        creneauFin: new Date(a ?? 2026, (m ?? 1) - 1, j ?? 1, c.fin),
        livreurId: livreur === "aucun" ? null : livreur,
      })
      .then((k) => {
        toast.success(type === "livraison" ? "Livraison programmée." : "Ramassage programmé.");
        setCode(k);
      })
      .catch((e: unknown) => toast.error(messageErreur(e)));
  }

  if (code && client) {
    return (
      <Dialog open onOpenChange={(o) => !o && onFermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Code de confirmation</DialogTitle>
            <DialogDescription>
              Le client donne ce code au livreur à la remise. Envoyez-le-lui maintenant.
            </DialogDescription>
          </DialogHeader>
          <p className="montant py-4 text-center text-5xl font-extrabold tracking-[0.3em]">
            {code}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onFermer}>
              Fermer
            </Button>
            {clientInitial?.consentement_messages !== false ? (
              <Button asChild>
                <a
                  href={lienWhatsApp(
                    client.telephone,
                    messageCode(client.nom, code, type, boutique.nom),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onFermer}
                >
                  Envoyer par WhatsApp
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={nouveauClient === null} onOpenChange={(o) => !o && onFermer()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {type === "livraison"
                ? `Livraison du dépôt ${depot?.numero ?? ""}`
                : "Nouveau ramassage"}
            </DialogTitle>
            <DialogDescription>
              {type === "livraison"
                ? "Le linge est apporté chez le client."
                : "Le livreur va chercher le linge chez le client."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!clientInitial ? (
              <ChoixClient
                pressingId={pressing.id}
                client={client}
                onChoisir={setClient}
                onNouveau={(s) => setNouveauClient(s)}
              />
            ) : null}
            <Champ id="lv-adresse" libelle="Adresse / quartier">
              <Input
                id="lv-adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Cocody Angré 8e tranche, rue …"
                className="h-11"
              />
            </Champ>
            <Champ id="lv-repere" libelle="Point de repère">
              <Input
                id="lv-repere"
                value={repere}
                onChange={(e) => setRepere(e.target.value)}
                placeholder="Près de la pharmacie …"
                className="h-11"
              />
            </Champ>
            {zones.length ? (
              <Champ id="lv-zone" libelle="Zone">
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger id="lv-zone" className="h-11">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.nom} · {formatFCFA(z.frais)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Champ>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune zone définie : la course sera sans frais. Les zones se créent dans Livraisons
                → Zones.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Champ id="lv-jour" libelle="Jour">
                <Input
                  id="lv-jour"
                  type="date"
                  min={toISODate(new Date())}
                  value={jour}
                  onChange={(e) => setJour(e.target.value)}
                  className="h-11"
                />
              </Champ>
              <Champ id="lv-creneau" libelle="Créneau">
                <Select value={creneau} onValueChange={setCreneau}>
                  <SelectTrigger id="lv-creneau" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRENEAUX.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Champ>
            </div>
            {role !== "caissier" && livreurs.length ? (
              <Champ id="lv-livreur" libelle="Livreur">
                <Select value={livreur} onValueChange={setLivreur}>
                  <SelectTrigger id="lv-livreur" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun">Plus tard</SelectItem>
                    {livreurs.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Champ>
            ) : null}
            {zone ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                Frais : <strong className="montant">{frais ? formatFCFA(frais) : "offerts"}</strong>
                {type === "livraison" && zone.seuil_gratuite != null
                  ? ` (offerts dès ${formatFCFA(zone.seuil_gratuite)})`
                  : ""}
                {type === "livraison" && frais ? " · ajoutés au reste à payer du dépôt" : ""}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onFermer}>
              Annuler
            </Button>
            <Button disabled={!valide || creer.isPending} onClick={valider}>
              {creer.isPending ? <Loader2 className="animate-spin" /> : null}Programmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ClientDialog
        ouvert={nouveauClient !== null}
        onFermer={() => setNouveauClient(null)}
        pressingId={pressing.id}
        mode="rapide"
        saisieInitiale={nouveauClient ?? ""}
        onEnregistre={(c) => {
          setNouveauClient(null);
          setClient({ id: c.id, nom: c.nom, telephone: c.telephone, solde_du: 0 });
        }}
      />
    </>
  );
}

export function DialogueTerminer({ course, onFermer }: { course: Course; onFermer: () => void }) {
  const terminer = useTerminerCourse();
  const reste = course.depots?.reste_a_payer ?? 0;
  const [code, setCode] = useState("");
  const [montant, setMontant] = useState(course.type === "livraison" ? reste : 0);
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [reference, setReference] = useState("");
  const valide =
    (!course.code_confirmation || code.trim().length === 4) &&
    (montant === 0 || moyen === "especes" || reference.trim().length > 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {course.type === "livraison" ? "Linge remis au client" : "Linge récupéré"}
          </DialogTitle>
          <DialogDescription>
            {course.clients?.nom}
            {course.depots ? ` · dépôt ${course.depots.numero}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {course.code_confirmation ? (
            <Champ id="tm-code" libelle="Code donné par le client">
              <Input
                id="tm-code"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="montant h-14 text-center text-3xl tracking-[0.4em]"
                autoFocus
              />
            </Champ>
          ) : null}
          {course.type === "livraison" && reste > 0 ? (
            <>
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm">
                Reste à encaisser : <strong className="montant">{formatFCFA(reste)}</strong>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MOYENS_COMPTOIR.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoyen(m)}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-sm font-medium",
                      moyen === m ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {LIBELLES_MOYEN[m]}
                  </button>
                ))}
              </div>
              <Champ id="tm-montant" libelle="Montant encaissé">
                <SaisieMontant
                  id="tm-montant"
                  valeur={montant}
                  onChange={(n) => setMontant(Math.min(n, reste))}
                />
              </Champ>
              {moyen !== "especes" ? (
                <Champ id="tm-ref" libelle="Référence de transaction">
                  <Input
                    id="tm-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-11"
                  />
                </Champ>
              ) : null}
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            disabled={!valide || terminer.isPending}
            onClick={() =>
              terminer
                .mutateAsync({ id: course.id, code, montant, moyen, reference })
                .then(() => {
                  toast.success("Course terminée.");
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            {terminer.isPending ? <Loader2 className="animate-spin" /> : null}Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogueEchec({
  course,
  annulation = false,
  onFermer,
}: {
  course: Course;
  annulation?: boolean;
  onFermer: () => void;
}) {
  const avancer = useAvancerCourse();
  const [motif, setMotif] = useState("");
  const rapides = [
    "Client absent",
    "Client injoignable",
    "Adresse introuvable",
    "Client a reporté",
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{annulation ? "Annuler la course" : "Course non effectuée"}</DialogTitle>
          <DialogDescription>
            {course.clients?.nom} · {course.adresse}
          </DialogDescription>
        </DialogHeader>
        {!annulation ? (
          <div className="flex flex-wrap gap-1.5">
            {rapides.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMotif(r)}
                className="h-9 rounded-full border px-3 text-sm hover:bg-muted"
              >
                {r}
              </button>
            ))}
          </div>
        ) : null}
        <Textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          placeholder="Motif"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Retour
          </Button>
          <Button
            variant="destructive"
            disabled={(!annulation && motif.trim().length < 3) || avancer.isPending}
            onClick={() =>
              avancer
                .mutateAsync({ id: course.id, statut: annulation ? "annule" : "echoue", motif })
                .then(() => {
                  toast.success(
                    annulation ? "Course annulée." : "Échec enregistré : le comptoir est prévenu.",
                  );
                  onFermer();
                })
                .catch((e: unknown) => toast.error(messageErreur(e)))
            }
          >
            {annulation ? "Annuler la course" : "Enregistrer l’échec"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
