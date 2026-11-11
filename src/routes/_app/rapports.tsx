import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/rapports")({
  head: () => ({ meta: [{ title: "Rapports — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Rapports" />,
});
