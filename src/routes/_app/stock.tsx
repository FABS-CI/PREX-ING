import { createFileRoute } from "@tanstack/react-router";

import { BientotDisponible } from "@/components/common/BientotDisponible";

export const Route = createFileRoute("/_app/stock")({
  head: () => ({ meta: [{ title: "Stock — PREX’ING" }] }),
  component: () => <BientotDisponible titre="Stock" />,
});
