import type { ReactNode } from "react";

import { Logo } from "./Logo";

/** Gabarit des pages publiques (clients finaux), pensées d'abord pour le téléphone. */
export function PageClient({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16">{children}</main>
      <footer className="flex items-center justify-center gap-2 pb-8 text-xs text-muted-foreground">
        Propulsé par <Logo className="scale-75" />
      </footer>
    </div>
  );
}
