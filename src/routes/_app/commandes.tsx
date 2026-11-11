import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/commandes")({
  head: () => ({ meta: [{ title: "Commandes en ligne — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Commandes en ligne" />,
});
