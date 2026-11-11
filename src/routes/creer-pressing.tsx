import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Champ } from "@/components/common/Champ";
import { Chargement } from "@/components/common/Chargement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import { normaliserTelephone, telephoneValide } from "@/lib/format";

export const Route = createFileRoute("/creer-pressing")({
  head: () => ({ meta: [{ title: "Créer mon pressing — PREX’ING" }] }),
  component: CreerPressing,
});

const COMMUNES = [
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Port-Bouët",
  "Treichville",
  "Yopougon",
  "Bingerville",
  "Songon",
  "Anyama",
  "Autre",
];

function CreerPressing() {
  const { etat, profil, recharger } = useSession();
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [boutique, setBoutique] = useState("Boutique principale");
  const [commune, setCommune] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  if (etat === "chargement") return <Chargement plein />;
  if (etat === "deconnecte") return <Navigate to="/connexion" replace />;
  if (etat === "pret") return <Navigate to="/" replace />;

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (nom.trim().length < 2) err["nom"] = "Indiquez le nom du pressing.";
    const tel = telephone || profil?.telephone || "";
    if (!telephoneValide(tel)) err["telephone"] = "Numéro ivoirien à 10 chiffres.";
    if (boutique.trim().length < 2) err["boutique"] = "Indiquez le nom de la boutique.";
    if (!commune) err["commune"] = "Choisissez la commune.";
    setErreurs(err);
    if (Object.keys(err).length) return;

    setEnvoi(true);
    const { error } = await supabase.rpc("creer_pressing", {
      p_nom: nom.trim(),
      p_telephone: normaliserTelephone(tel),
      p_boutique_nom: boutique.trim(),
      p_commune: commune,
    });
    if (error) {
      setEnvoi(false);
      toast.error(messageErreur(error));
      return;
    }
    await recharger();
    setEnvoi(false);
    toast.success("Votre pressing est prêt. Le catalogue de départ a été installé.");
    void navigate({ to: "/tableau-de-bord" });
  }

  return (
    <AuthLayout
      titre="Créer mon pressing"
      sousTitre="Un catalogue de départ (articles, services et prix) sera installé ; vous pourrez tout modifier."
    >
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        <Champ id="nom" libelle="Nom du pressing" erreur={erreurs["nom"]}>
          <Input
            id="nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-11"
            placeholder="Pressing Le Soleil"
          />
        </Champ>
        <Champ id="tel" libelle="Téléphone du pressing" erreur={erreurs["telephone"]}>
          <Input
            id="tel"
            type="tel"
            inputMode="tel"
            placeholder={profil?.telephone ?? "07 07 07 07 07"}
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Champ id="boutique" libelle="Nom de la première boutique" erreur={erreurs["boutique"]}>
          <Input
            id="boutique"
            value={boutique}
            onChange={(e) => setBoutique(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Champ id="commune" libelle="Commune" erreur={erreurs["commune"]}>
          <Select value={commune} onValueChange={setCommune}>
            <SelectTrigger id="commune" className="h-11">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {COMMUNES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Champ>
        <Button type="submit" className="h-11 w-full text-base" disabled={envoi}>
          {envoi ? <Loader2 className="animate-spin" /> : null}
          Créer mon pressing
        </Button>
      </form>
    </AuthLayout>
  );
}
