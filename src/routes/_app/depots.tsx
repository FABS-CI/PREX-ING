import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/depots")({
  head: () => ({ meta: [{ title: "Dépôts — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Dépôts" />,
});
