import { useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Champ } from "@/components/common/Champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { messageErreur } from "@/lib/erreurs";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [{ title: "Connexion — PREX’ING" }] }),
  component: Connexion,
});

function Connexion() {
  const { etat } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (etat === "pret" || etat === "sans_pressing") return <Navigate to="/" replace />;

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    });
    setEnvoi(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    void navigate({ to: "/" });
  }

  return (
    <AuthLayout titre="Connexion" sousTitre="Accédez à votre pressing.">
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        <Champ id="email" libelle="Email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </Champ>
        <Champ id="mdp" libelle="Mot de passe">
          <Input
            id="mdp"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="h-11"
            required
          />
        </Champ>
        {erreur ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {erreur}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-11 w-full text-base"
          disabled={envoi || !email || !motDePasse}
        >
          {envoi ? <Loader2 className="animate-spin" /> : null}
          Se connecter
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link
            to="/mot-de-passe-oublie"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Mot de passe oublié ?
          </Link>
          <Link
            to="/inscription"
            className="font-medium text-primary hover:underline dark:text-info"
          >
            Créer un compte
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
