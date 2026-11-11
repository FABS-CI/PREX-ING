import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/livraisons")({
  head: () => ({ meta: [{ title: "Livraisons — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Livraisons" />,
});
