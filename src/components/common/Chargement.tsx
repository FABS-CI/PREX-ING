import { Loader2 } from "lucide-react";

export function Chargement({
  texte = "Chargement…",
  plein = false,
}: {
  texte?: string;
  plein?: boolean;
}) {
  return (
    <div
      className={
        plein
          ? "flex min-h-screen items-center justify-center bg-background"
          : "flex items-center justify-center py-16"
      }
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">{texte}</span>
      </div>
    </div>
  );
}
