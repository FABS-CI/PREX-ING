import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Parent des pages Dépôts : la liste (depots/index.tsx) et la fiche (depots/$id.tsx). */
export const Route = createFileRoute("/_app/depots")({
  component: () => <Outlet />,
});
