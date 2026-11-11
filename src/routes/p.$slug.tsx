import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MapPin, MessageCircle, Phone, Truck } from "lucide-react";

import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { PageClient } from "@/components/common/PageClient";
import { CRENEAUX } from "@/components/livraisons/Dialogues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDemanderRamassage, usePagePressing, type PagePressing } from "@/hooks/usePortail";
import { messageErreur } from "@/lib/erreurs";
import {
  formatDate,
  formatFCFA,
  formatTelephone,
  lienWhatsApp,
  telephoneValide,
  toISODate,
  ajouterJours,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({ meta: [{ title: "Pressing — tarifs et ramassage à domicile" }] }),
  component: PagePublique,
});

function FormulaireRamassage({ page }: { page: PagePressing }) {
  const demander = useDemanderRamassage();
  const [boutique, setBoutique] = useState(page.boutiques[0]?.id ?? "");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [repere, setRepere] = useState("");
  const [jour, setJour] = useState(toISODate(ajouterJours(new Date(), 1)));
  const [creneau, setCreneau] = useState("matin");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (nom.trim().length < 2 || adresse.trim().length < 3)
      return setErreur("Indiquez votre nom et votre adresse.");
    if (!telephoneValide(telephone))
      return setErreur("Numéro ivoirien à 10 chiffres (ex. 07 07 07 07 07).");
    try {
      await demander.mutateAsync({
        slug: page.slug,
        boutiqueId: boutique,
        nom,
        telephone,
        adresse,
        repere,
        jour,
        creneau,
        note,
      });
      setFait(true);
    } catch (err) {
      setErreur(messageErreur(err));
    }
  }

  if (fait) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 size-10 text-success" />
        <p className="text-lg font-semibold">Demande envoyée</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {page.nom} vous contactera pour confirmer le passage du livreur le {formatDate(jour)} (
          {CRENEAUX.find((c) => c.id === creneau)?.libelle.toLowerCase()}).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="space-y-4 rounded-2xl border bg-card p-5" noValidate>
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Truck className="size-5 text-info" />
        Ramassage à domicile
      </div>
      {page.boutiques.length > 1 ? (
        <Champ id="r-bo" libelle="Boutique">
          <Select value={boutique} onValueChange={setBoutique}>
            <SelectTrigger id="r-bo" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {page.boutiques.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nom}
                  {b.commune ? ` · ${b.commune}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Champ id="r-nom" libelle="Votre nom">
          <Input
            id="r-nom"
            autoComplete="name"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-12"
          />
        </Champ>
        <Champ id="r-tel" libelle="Téléphone">
          <Input
            id="r-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07 07 07 07 07"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="h-12"
          />
        </Champ>
      </div>
      <Champ id="r-adr" libelle="Adresse / quartier">
        <Input
          id="r-adr"
          autoComplete="street-address"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="h-12"
        />
      </Champ>
      <Champ id="r-rep" libelle="Point de repère">
        <Input
          id="r-rep"
          value={repere}
          onChange={(e) => setRepere(e.target.value)}
          placeholder="Près de…"
          className="h-12"
        />
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ id="r-jour" libelle="Jour">
          <Input
            id="r-jour"
            type="date"
            min={toISODate(new Date())}
            max={toISODate(ajouterJours(new Date(), 30))}
            value={jour}
            onChange={(e) => setJour(e.target.value)}
            className="h-12"
          />
        </Champ>
        <Champ id="r-cre" libelle="Créneau">
          <Select value={creneau} onValueChange={setCreneau}>
            <SelectTrigger id="r-cre" className="h-12">
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
      <Champ id="r-note" libelle="Ce que vous confiez (facultatif)">
        <Textarea
          id="r-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. 5 chemises, 2 draps, 1 boubou"
        />
      </Champ>
      {erreur ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {erreur}
        </p>
      ) : null}
      <Button type="submit" className="h-12 w-full text-base" disabled={demander.isPending}>
        {demander.isPending ? <Loader2 className="animate-spin" /> : null}Demander un ramassage
      </Button>
      <p className="text-xs text-muted-foreground">
        Votre numéro sert uniquement à {page.nom} pour vous contacter au sujet de votre linge.
      </p>
    </form>
  );
}

function Tarifs({ page }: { page: PagePressing }) {
  const services = useMemo(() => [...new Set(page.tarifs.map((t) => t.service))], [page.tarifs]);
  const [service, setService] = useState(services[0] ?? "");
  const lignes = page.tarifs.filter((t) => t.service === service);
  const categories = [...new Set(lignes.map((t) => t.categorie ?? "Autres"))];
  if (!page.tarifs.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Nos tarifs</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {services.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setService(s)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
              s === service
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {categories.map((c) => (
          <div key={c}>
            <p className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">{c}</p>
            <ul className="divide-y">
              {lignes
                .filter((t) => (t.categorie ?? "Autres") === c)
                .map((t) => (
                  <li
                    key={`${t.article}-${t.service}`}
                    className="flex justify-between px-4 py-2.5 text-sm"
                  >
                    <span>{t.article}</span>
                    <span className="montant font-semibold">{formatFCFA(t.prix)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      {page.kilo.length ? (
        <p className="text-sm text-muted-foreground">
          Au kilo :{" "}
          {page.kilo
            .map(
              (k) =>
                `${k.service} ${formatFCFA(k.prix_kg)}/kg (minimum ${String(k.poids_min).replace(".", ",")} kg)`,
            )
            .join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

function PagePublique() {
  const { slug } = Route.useParams();
  const { data: page, isLoading, error } = usePagePressing(slug);
  if (isLoading) return <Chargement plein />;
  if (error || !page) {
    return (
      <PageClient>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">Page introuvable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vérifiez l’adresse communiquée par votre pressing.
          </p>
        </div>
      </PageClient>
    );
  }
  const tel = page.boutiques[0]?.telephone ?? page.telephone;
  return (
    <PageClient>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{page.nom}</h1>
        <ul className="mt-3 space-y-1.5">
          {page.boutiques.map((b) => (
            <li key={b.id} className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              {b.nom}
              {[b.adresse, b.commune].filter(Boolean).length
                ? ` · ${[b.adresse, b.commune].filter(Boolean).join(", ")}`
                : ""}
            </li>
          ))}
        </ul>
        {tel ? (
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline" className="h-11">
              <a href={`tel:${tel}`}>
                <Phone />
                {formatTelephone(tel)}
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={lienWhatsApp(tel)} target="_blank" rel="noreferrer">
                <MessageCircle />
                WhatsApp
              </a>
            </Button>
          </div>
        ) : null}
      </header>
      <div className="space-y-8">
        <FormulaireRamassage page={page} />
        <Tarifs page={page} />
        {page.zones.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Zones de livraison</h2>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {page.zones.map((z) => (
                <li key={z.nom} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    {z.nom}
                    {z.communes.length ? (
                      <span className="block text-xs text-muted-foreground">
                        {z.communes.join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right">
                    <span className="montant block font-semibold">{formatFCFA(z.frais)}</span>
                    {z.seuil_gratuite ? (
                      <span className="montant block text-xs text-muted-foreground">
                        offerte dès {formatFCFA(z.seuil_gratuite)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageClient>
  );
}
