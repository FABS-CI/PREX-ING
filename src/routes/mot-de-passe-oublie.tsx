import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Champ } from "@/components/common/Champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { messageErreur } from "@/lib/erreurs";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({ meta: [{ title: "Mot de passe oublié — PREX’ING" }] }),
  component: MotDePasseOublie,
});

function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    setEnvoi(false);
    if (error) setErreur(messageErreur(error));
    else setFait(true);
  }

  return (
    <AuthLayout
      titre="Mot de passe oublié"
      sousTitre="Recevez un lien pour choisir un nouveau mot de passe."
    >
      {fait ? (
        <div className="rounded-xl border bg-card p-5">
          <MailCheck className="mb-3 size-8 text-success" />
          <p className="text-sm leading-relaxed">
            Si un compte existe pour <strong>{email}</strong>, un lien vient d’être envoyé.
          </p>
        </div>
      ) : (
        <form onSubmit={soumettre} className="space-y-4">
          <Champ id="email" libelle="Email">
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
            />
          </Champ>
          {erreur ? (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{erreur}</p>
          ) : null}
          <Button type="submit" className="h-11 w-full text-base" disabled={envoi || !email}>
            {envoi ? <Loader2 className="animate-spin" /> : null}
            Envoyer le lien
          </Button>
        </form>
      )}
      <Link
        to="/connexion"
        className="mt-4 inline-block text-sm font-medium text-primary hover:underline dark:text-info"
      >
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
