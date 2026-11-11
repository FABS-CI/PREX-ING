import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EtatVide({
  icone: Icone,
  titre,
  texte,
  action,
}: {
  icone: LucideIcon;
  titre: string;
  texte?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icone className="size-6" />
      </div>
      <p className="font-semibold text-foreground">{titre}</p>
      {texte ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{texte}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
