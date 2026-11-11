import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/equipe")({
  head: () => ({ meta: [{ title: "Équipe — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Équipe" />,
});
