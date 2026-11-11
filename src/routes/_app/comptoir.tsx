import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { ClientDialog } from "@/components/clients/ClientForm";
import { Chargement } from "@/components/common/Chargement";
import { ChoixClient, type ClientChoisi } from "@/components/comptoir/ChoixClient";
import { Confirmation } from "@/components/comptoir/Confirmation";
import { GrilleArticles } from "@/components/comptoir/GrilleArticles";
import { ZoneImpression, type ContenuImpression } from "@/components/comptoir/Impression";
import { Panier, type EtatPaiement } from "@/components/comptoir/Panier";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEspace } from "@/contexts/SessionContext";
import { useCatalogue } from "@/hooks/useCatalogue";
import { useSessionOuverte } from "@/hooks/useCaisse";
import { useClient } from "@/hooks/useClients";
import { modeleMessage, useCreerDepot, type DepotCree } from "@/hooks/useCreerDepot";
import {
  dateRetraitPrevue,
  depassePlafond,
  montantRemise,
  nombrePieces,
  sousTotal,
  type LignePanier,
} from "@/lib/comptoir";
import { messageErreur } from "@/lib/erreurs";
import { formatDate, formatFCFA, lienWhatsApp, remplirModele } from "@/lib/format";
import { synchroniserCompteur } from "@/lib/numerotation";
import type { ModeFacturation } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/comptoir")({
  head: () => ({ meta: [{ title: "Comptoir — PREX’ING" }] }),
  validateSearch: (s: Record<string, unknown>): { client?: string } =>
    typeof s["client"] === "string" ? { client: s["client"] } : {},
  component: Comptoir,
});

const MODES: { id: ModeFacturation; libelle: string }[] = [
  { id: "article", libelle: "À l’article" },
  { id: "kilo", libelle: "Au kilo" },
  { id: "forfait", libelle: "Forfait" },
  { id: "abonnement", libelle: "Abonnement" },
];

const etatInitial = (): EtatPaiement => ({
  express: false,
  typeRemise: "montant",
  valeurRemise: 0,
  avance: 0,
  moyen: "especes",
  reference: "",
  dateRetrait: dateRetraitPrevue([], false),
  emplacement: "",
});

function Comptoir() {
  const { pressing, boutique, profil, user, plafondRemise } = useEspace();
  const navigate = useNavigate();
  const { client: clientParam } = Route.useSearch();
  const catalogue = useCatalogue(pressing.id);
  const creerDepot = useCreerDepot();

  const [client, setClient] = useState<ClientChoisi | null>(null);
  const [lignes, setLignes] = useState<LignePanier[]>([]);
  const [paiement, setPaiement] = useState<EtatPaiement>(etatInitial);
  const [dateManuelle, setDateManuelle] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [nouveauClient, setNouveauClient] = useState<string | null>(null);
  const [panierMobile, setPanierMobile] = useState(false);
  const [confirmerVider, setConfirmerVider] = useState(false);
  const [resultat, setResultat] = useState<{
    depot: DepotCree;
    client: ClientChoisi;
    whatsapp: string | null;
  } | null>(null);
  const [impression, setImpression] = useState<ContenuImpression | null>(null);
  const rechercheRef = useRef<HTMLInputElement>(null);
  const caisse = useSessionOuverte(boutique.id);

  // Client passé dans l'adresse (bouton « Nouveau dépôt » d'une fiche client).
  const ficheParam = useClient(clientParam);
  useEffect(() => {
    const c = ficheParam.data?.client;
    if (c && !client) {
      setClient({
        id: c.id,
        nom: c.nom,
        telephone: c.telephone,
        solde_du: ficheParam.data?.solde?.solde_du ?? 0,
      });
    }
  }, [ficheParam.data, client]);

  // Consentement aux messages du client choisi (pour le bouton WhatsApp).
  const ficheClient = useClient(client?.id);

  // Numérotation : reprendre le compteur de cet appareil.
  useEffect(() => {
    void synchroniserCompteur(boutique.id, boutique.prefixe);
  }, [boutique.id, boutique.prefixe]);

  // Premier service par défaut.
  useEffect(() => {
    const premier = catalogue.data?.services.find((s) => s.actif);
    if (!serviceId && premier) setServiceId(premier.id);
  }, [catalogue.data, serviceId]);

  // Date de retrait recalculée tant qu'elle n'a pas été modifiée à la main.
  useEffect(() => {
    if (!dateManuelle)
      setPaiement((p) => ({ ...p, dateRetrait: dateRetraitPrevue(lignes, p.express) }));
  }, [lignes, paiement.express, dateManuelle]);

  const quantites = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lignes) m.set(`${l.articleId}|${l.serviceId}`, l.quantite);
    return m;
  }, [lignes]);

  const st = sousTotal(lignes, paiement.express);
  const remise = montantRemise(st, paiement.typeRemise, paiement.valeurRemise);
  const net = st - remise;
  const pieces = nombrePieces(lignes);

  let blocage: string | null = null;
  if (!client) blocage = "Choisissez d’abord le client.";
  else if (lignes.length === 0) blocage = "Ajoutez au moins un article.";
  else if (paiement.avance > net) blocage = "L’avance dépasse le net à payer.";
  else if (paiement.avance > 0 && paiement.moyen !== "especes" && !paiement.reference.trim())
    blocage = "Saisissez la référence de la transaction mobile money.";
  const peutValider = blocage === null && !depassePlafond(st, remise, plafondRemise);

  const reinitialiser = useCallback(() => {
    setClient(null);
    setLignes([]);
    setPaiement(etatInitial());
    setDateManuelle(false);
    setResultat(null);
    setPanierMobile(false);
    if (clientParam) void navigate({ to: "/comptoir", search: {}, replace: true });
    setTimeout(() => rechercheRef.current?.focus(), 50);
  }, [clientParam, navigate]);

  const valider = useCallback(async () => {
    if (!client || !peutValider || creerDepot.isPending) return;
    try {
      const depot = await creerDepot.mutateAsync({
        pressingId: pressing.id,
        boutiqueId: boutique.id,
        prefixe: boutique.prefixe,
        clientId: client.id,
        lignes,
        express: paiement.express,
        remise,
        dateRetrait: paiement.dateRetrait,
        emplacement: paiement.emplacement,
        observations: "",
        avance: paiement.avance,
        moyen: paiement.moyen,
        reference: paiement.reference,
      });
      let whatsapp: string | null = null;
      if (ficheClient.data?.client?.consentement_messages) {
        const modele =
          (await modeleMessage(pressing.id, "depot_cree")) ??
          "Bonjour {client}, votre dépôt n° {numero} est bien enregistré chez {boutique}. Reste à payer : {reste} FCFA. Retrait prévu le {date}.";
        whatsapp = lienWhatsApp(
          client.telephone,
          remplirModele(modele, {
            client: client.nom,
            numero: depot.depot.numero,
            montant: formatFCFA(depot.depot.net_a_payer, false),
            reste: formatFCFA(depot.depot.reste_a_payer, false),
            date: formatDate(depot.depot.date_retrait_prevue),
            boutique: boutique.nom,
          }),
        );
      }
      setResultat({ depot, client, whatsapp });
      setPanierMobile(false);
      toast.success(`Dépôt ${depot.depot.numero} enregistré.`);
    } catch (e) {
      const numero = (e as { depotCree?: string }).depotCree;
      toast.error(
        numero
          ? `Le dépôt ${numero} est enregistré, mais l’avance n’a pas pu l’être : ${messageErreur(e)}. Encaissez-la depuis le dépôt.`
          : messageErreur(e),
      );
    }
  }, [
    client,
    peutValider,
    creerDepot,
    pressing.id,
    boutique,
    lignes,
    paiement,
    remise,
    ficheClient.data,
  ]);

  // Impression : on affiche la zone, puis on ouvre la fenêtre d'impression du navigateur.
  useEffect(() => {
    if (!impression) return;
    const t = setTimeout(() => {
      window.print();
      setImpression(null);
    }, 150);
    return () => clearTimeout(t);
  }, [impression]);

  // Raccourcis clavier.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        rechercheRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setNouveauClient("");
      } else if (e.key === "F9") {
        e.preventDefault();
        void valider();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [valider]);

  const majPaiement = (patch: Partial<EtatPaiement>) => {
    if (patch.dateRetrait) setDateManuelle(true);
    setPaiement((p) => ({ ...p, ...patch }));
  };

  if (catalogue.isLoading) return <Chargement texte="Préparation du comptoir…" />;
  if (catalogue.error || !catalogue.data)
    return (
      <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        {messageErreur(catalogue.error)}
      </p>
    );

  if (resultat) {
    return (
      <>
        <Confirmation
          depot={resultat.depot}
          clientNom={resultat.client.nom}
          lienWhatsApp={resultat.whatsapp}
          onImprimer={setImpression}
          onNouveau={reinitialiser}
        />
        <ZoneImpression
          contenu={impression}
          depot={resultat.depot}
          client={resultat.client}
          pressing={pressing}
          boutique={boutique}
          caissier={profil?.nom ?? user.email ?? ""}
        />
      </>
    );
  }

  const panier = (
    <Panier
      lignes={lignes}
      etat={paiement}
      onEtat={majPaiement}
      onQuantite={(cle, delta) =>
        setLignes((ls) =>
          ls.flatMap((l) =>
            l.cle !== cle
              ? [l]
              : l.quantite + delta <= 0
                ? []
                : [{ ...l, quantite: l.quantite + delta }],
          ),
        )
      }
      onSupprimer={(cle) => setLignes((ls) => ls.filter((l) => l.cle !== cle))}
      onObservations={(cle, texte) =>
        setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, observations: texte } : l)))
      }
      onVider={() => setConfirmerVider(true)}
      plafondRemise={plafondRemise}
      peutValider={peutValider}
      enCours={creerDepot.isPending}
      onValider={() => void valider()}
      messageBlocage={blocage}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      <div className="space-y-4">
        {caisse.isSuccess && !caisse.data ? (
          <Link
            to="/caisse"
            className="block rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm hover:bg-warning/15"
          >
            La caisse n’est pas ouverte : les encaissements ne seront rattachés à aucune session.
            Ouvrir la caisse
          </Link>
        ) : null}
        <ChoixClient
          ref={rechercheRef}
          pressingId={pressing.id}
          client={client}
          onChoisir={setClient}
          onNouveau={(saisie) => setNouveauClient(saisie)}
        />

        <div
          className="flex gap-1.5 overflow-x-auto"
          role="radiogroup"
          aria-label="Mode de facturation"
        >
          {MODES.map((m) => {
            const dispo = m.id === "article";
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={m.id === "article"}
                disabled={!dispo}
                title={dispo ? undefined : "Bientôt disponible"}
                className={cn(
                  "h-9 shrink-0 rounded-lg px-3 text-sm font-medium",
                  dispo
                    ? "bg-secondary text-secondary-foreground ring-1 ring-primary/30"
                    : "cursor-not-allowed text-muted-foreground/70",
                )}
              >
                {m.libelle}
                {!dispo ? <span className="ml-1 text-xs">· bientôt</span> : null}
              </button>
            );
          })}
        </div>

        <GrilleArticles
          catalogue={catalogue.data}
          boutiqueId={boutique.id}
          serviceId={serviceId}
          onService={setServiceId}
          quantites={quantites}
          onAjouter={(article, service, prix) => {
            setLignes((ls) => {
              const cle = `${article.id}|${service.id}`;
              const existe = ls.find((l) => l.cle === cle);
              if (existe)
                return ls.map((l) => (l.cle === cle ? { ...l, quantite: l.quantite + 1 } : l));
              return [
                ...ls,
                {
                  cle,
                  articleId: article.id,
                  serviceId: service.id,
                  articleNom: article.nom,
                  serviceNom: service.nom,
                  quantite: 1,
                  prixBase: prix,
                  majorationExpressPct: service.majoration_express_pct,
                  delaiJours: service.delai_jours,
                  observations: "",
                },
              ];
            });
          }}
        />
      </div>

      {/* Ordinateur / tablette : panier fixe à droite */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 h-[calc(100vh-6.5rem)] overflow-hidden rounded-2xl border bg-card">
          {panier}
        </div>
      </aside>

      {/* Téléphone : barre du panier */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 px-3 pb-2 md:bottom-0 md:pb-4 lg:hidden">
        <Button
          className="h-14 w-full justify-between text-base shadow-lg"
          onClick={() => setPanierMobile(true)}
        >
          <span className="flex items-center gap-2">
            <ShoppingBasket />
            Panier ({pieces})
          </span>
          <span className="montant font-bold">{formatFCFA(net)}</span>
        </Button>
      </div>
      <div className="h-20 lg:hidden" />

      <Sheet open={panierMobile} onOpenChange={setPanierMobile}>
        <SheetContent side="bottom" className="h-[92vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Panier</SheetTitle>
          </SheetHeader>
          {panier}
        </SheetContent>
      </Sheet>

      <ClientDialog
        ouvert={nouveauClient !== null}
        onFermer={() => setNouveauClient(null)}
        pressingId={pressing.id}
        mode="rapide"
        saisieInitiale={nouveauClient ?? ""}
        onEnregistre={(c) => {
          setNouveauClient(null);
          setClient({ id: c.id, nom: c.nom, telephone: c.telephone, solde_du: 0 });
          toast.success(`Client ${c.nom} créé.`);
        }}
      />

      <AlertDialog open={confirmerVider} onOpenChange={setConfirmerVider}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vider le panier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {pieces} pièces saisies seront retirées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLignes([]);
                setPaiement(etatInitial());
                setDateManuelle(false);
              }}
            >
              Vider le panier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
