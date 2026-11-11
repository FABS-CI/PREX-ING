import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/common/AuthLayout";
import { Champ } from "@/components/common/Champ";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { messageErreur } from "@/lib/erreurs";

export const Route = createFileRoute("/nouveau-mot-de-passe")({
  head: () => ({ meta: [{ title: "Nouveau mot de passe — PREX’ING" }] }),
  component: NouveauMotDePasse,
});

function NouveauMotDePasse() {
  const navigate = useNavigate();
  const [mdp, setMdp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    if (mdp.length < 8) {
      setErreur("Au moins 8 caractères.");
      return;
    }
    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) {
      setErreur(messageErreur(error));
      return;
    }
    toast.success("Mot de passe modifié.");
    void navigate({ to: "/" });
  }

  return (
    <AuthLayout titre="Nouveau mot de passe">
      <form onSubmit={soumettre} className="space-y-4">
        <Champ
          id="mdp"
          libelle="Nouveau mot de passe"
          erreur={erreur ?? undefined}
          aide="Au moins 8 caractères."
        >
          <Input
            id="mdp"
            type="password"
            autoComplete="new-password"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            className="h-11"
          />
        </Champ>
        <Button type="submit" className="h-11 w-full text-base" disabled={envoi}>
          {envoi ? <Loader2 className="animate-spin" /> : null}
          Enregistrer
        </Button>
      </form>
    </AuthLayout>
  );
}
