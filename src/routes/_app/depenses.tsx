import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Dépenses" />,
});
