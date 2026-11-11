import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/caisse")({
  head: () => ({ meta: [{ title: "Caisse — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Caisse" />,
});
