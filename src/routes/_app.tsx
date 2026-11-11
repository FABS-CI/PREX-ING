import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { Chargement } from "@/components/common/Chargement";
import { AppShell } from "@/components/layout/AppShell";
import { accueilPourRole, MENU } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";

/** Espace connecté : vérifie la session, le pressing et les droits d'accès à la page. */
export const Route = createFileRoute("/_app")({
  ssr: false,
  component: EspaceConnecte,
});

function EspaceConnecte() {
  const { etat, erreur, role, boutique, recharger, deconnexion } = useSession();
  const chemin = useRouterState({ select: (s) => s.location.pathname });

  if (etat === "chargement") return <Chargement plein texte="Ouverture de votre pressing…" />;
  if (etat === "deconnecte") return <Navigate to="/connexion" replace />;
  if (etat === "sans_pressing") return <Navigate to="/creer-pressing" replace />;
  if (etat === "erreur" || !boutique) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-warning" />
          <p className="font-semibold">Impossible d’ouvrir votre pressing</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {erreur ?? "Aucune boutique n’est accessible avec votre compte."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => void recharger()}>Réessayer</Button>
            <Button variant="outline" onClick={() => void deconnexion()}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Page réservée à d'autres rôles : retour à l'accueil du rôle.
  const entree = MENU.find((e) => chemin === e.to || chemin.startsWith(`${e.to}/`));
  if (entree && role && !entree.roles.includes(role)) {
    return <Navigate to={accueilPourRole(role)} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
