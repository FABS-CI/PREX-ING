import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/** Libellé + champ + message d'erreur, aligné verticalement. */
export function Champ({
  id,
  libelle,
  erreur,
  aide,
  children,
}: {
  id: string;
  libelle: string;
  erreur?: string | undefined;
  aide?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{libelle}</Label>
      {children}
      {erreur ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {erreur}
        </p>
      ) : aide ? (
        <p className="text-xs text-muted-foreground">{aide}</p>
      ) : null}
    </div>
  );
}
