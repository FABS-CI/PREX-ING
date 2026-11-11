import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Champ } from "@/components/common/Champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { messageErreur } from "@/lib/erreurs";
import { normaliserTelephone, telephoneValide } from "@/lib/format";

export const Route = createFileRoute("/inscription")({
  head: () => ({ meta: [{ title: "Créer un compte — PREX’ING" }] }),
  component: Inscription,
});

interface Erreurs {
  nom?: string;
  telephone?: string;
  email?: string;
  motDePasse?: string;
}

function Inscription() {
  const { etat } = useSession();
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [emailEnvoye, setEmailEnvoye] = useState(false);

  if (etat === "pret") return <Navigate to="/" replace />;
  if (etat === "sans_pressing") return <Navigate to="/creer-pressing" replace />;

  function valider(): boolean {
    const e: Erreurs = {};
    if (nom.trim().length < 2) e.nom = "Indiquez votre nom.";
    if (!telephoneValide(telephone))
      e.telephone = "Numéro ivoirien à 10 chiffres (ex. 07 07 07 07 07).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Adresse email invalide.";
    if (motDePasse.length < 8) e.motDePasse = "Au moins 8 caractères.";
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  async function soumettre(ev: FormEvent) {
    ev.preventDefault();
    setErreur(null);
    if (!valider()) return;
    setEnvoi(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: {
        data: { nom: nom.trim(), telephone: normaliserTelephone(telephone) },
        emailRedirectTo: `${window.location.origin}/creer-pressing`,
      },
    });
    setEnvoi(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    if (data.session) {
      void navigate({ to: "/creer-pressing" });
    } else {
      setEmailEnvoye(true);
    }
  }

  if (emailEnvoye) {
    return (
      <AuthLayout titre="Vérifiez vos emails">
        <div className="rounded-xl border bg-card p-5">
          <MailCheck className="mb-3 size-8 text-success" />
          <p className="text-sm leading-relaxed">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>. Ouvrez-le pour activer
            votre compte, puis créez votre pressing.
          </p>
        </div>
        <Link
          to="/connexion"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline dark:text-info"
        >
          Retour à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout titre="Créer un compte" sousTitre="14 jours d’essai gratuit, sans engagement.">
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        <Champ id="nom" libelle="Votre nom" erreur={erreurs.nom}>
          <Input
            id="nom"
            autoComplete="name"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Champ id="tel" libelle="Téléphone" erreur={erreurs.telephone}>
          <Input
            id="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07 07 07 07 07"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Champ id="email" libelle="Email" erreur={erreurs.email}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Champ
          id="mdp"
          libelle="Mot de passe"
          erreur={erreurs.motDePasse}
          aide="Au moins 8 caractères."
        >
          <Input
            id="mdp"
            type="password"
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="h-11"
          />
        </Champ>
        {erreur ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {erreur}
          </p>
        ) : null}
        <Button type="submit" className="h-11 w-full text-base" disabled={envoi}>
          {envoi ? <Loader2 className="animate-spin" /> : null}
          Créer mon compte
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link to="/connexion" className="font-medium text-primary hover:underline dark:text-info">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
