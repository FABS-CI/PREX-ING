import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Paramètres" />,
});
