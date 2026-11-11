import { createFileRoute, Navigate } from "@tanstack/react-router";

import { Chargement } from "@/components/common/Chargement";
import { accueilPourRole } from "@/components/layout/navigation";
import { useSession } from "@/contexts/SessionContext";

export const Route = createFileRoute("/")({
  component: Accueil,
});

function Accueil() {
  const { etat, role } = useSession();
  if (etat === "chargement") return <Chargement plein />;
  if (etat === "deconnecte") return <Navigate to="/connexion" replace />;
  if (etat === "sans_pressing") return <Navigate to="/creer-pressing" replace />;
  return <Navigate to={accueilPourRole(role)} replace />;
}
