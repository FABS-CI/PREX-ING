import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Moon, Store, Sun, Wifi, WifiOff } from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/contexts/SessionContext";
import { useEnLigne } from "@/hooks/useEnLigne";
import { useTheme } from "@/hooks/useTheme";
import { initiales } from "@/lib/format";
import { LIBELLES_ROLE } from "@/lib/types";
import { cn } from "@/lib/utils";

import { menuPourRole, type EntreeMenu } from "./navigation";

function LienMenu({ entree, onClick }: { entree: EntreeMenu; onClick?: () => void }) {
  const Icone = entree.icone;
  return (
    <Link
      to={entree.to}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      activeProps={{
        className:
          "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]",
      }}
    >
      <Icone className="size-[18px] shrink-0" />
      <span className="truncate">{entree.libelle}</span>
    </Link>
  );
}

function MenuLateral({ entrees, onNavigue }: { entrees: EntreeMenu[]; onNavigue?: () => void }) {
  const { pressing } = useSession();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pt-5 pb-4">
        <Logo clair />
        {pressing ? (
          <p className="mt-2 truncate text-xs text-sidebar-foreground/60">{pressing.nom}</p>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Menu principal">
        {entrees.map((e) => (
          <LienMenu key={e.to} entree={e} {...(onNavigue ? { onClick: onNavigue } : {})} />
        ))}
      </nav>
    </div>
  );
}

function PastilleConnexion() {
  const enLigne = useEnLigne();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        enLigne ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
      )}
      title={enLigne ? "Connecté à Internet" : "Pas de connexion Internet"}
    >
      {enLigne ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      <span className="hidden sm:inline">{enLigne ? "En ligne" : "Hors ligne"}</span>
    </span>
  );
}

function SelecteurBoutique() {
  const { boutiques, boutique, choisirBoutique } = useSession();
  if (!boutique) return null;
  if (boutiques.length <= 1) {
    return (
      <span className="hidden min-w-0 items-center gap-2 text-sm font-medium text-foreground sm:inline-flex">
        <Store className="size-4 text-muted-foreground" />
        <span className="truncate">{boutique.nom}</span>
      </span>
    );
  }
  return (
    <Select value={boutique.id} onValueChange={choisirBoutique}>
      <SelectTrigger className="h-9 w-[180px] sm:w-[220px]" aria-label="Boutique">
        <Store className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {boutiques.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MenuUtilisateur() {
  const { profil, role, deconnexion, user } = useSession();
  const { theme, basculer } = useTheme();
  const nom = profil?.nom ?? user?.email ?? "";
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={basculer} aria-label="Changer de thème">
        {theme === "sombre" ? <Sun /> : <Moon />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-0.5 pr-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initiales(nom)}
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block max-w-[140px] truncate text-sm font-medium">{nom}</span>
              <span className="block text-xs text-muted-foreground">
                {role ? LIBELLES_ROLE[role] : ""}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate">{nom}</span>
            <span className="block text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void deconnexion()} className="text-destructive">
            <LogOut className="size-4" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function BarreMobile({ entrees, onPlus }: { entrees: EntreeMenu[]; onPlus: () => void }) {
  const chemin = useRouterState({ select: (s) => s.location.pathname });
  const visibles = entrees.filter((e) => e.mobile).slice(0, 4);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${visibles.length + 1}, minmax(0, 1fr))` }}
      aria-label="Navigation"
    >
      {visibles.map((e) => {
        const Icone = e.icone;
        const actif = chemin.startsWith(e.to);
        return (
          <Link
            key={e.to}
            to={e.to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              actif ? "text-primary dark:text-info" : "text-muted-foreground",
            )}
          >
            <Icone className="size-5" />
            <span className="max-w-full truncate px-1">{e.libelle.split(" ")[0]}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onPlus}
        className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
      >
        <Menu className="size-5" />
        Plus
      </button>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useSession();
  const entrees = menuPourRole(role);
  const [tiroir, setTiroir] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 md:block">
        <MenuLateral entrees={entrees} />
      </aside>

      <Sheet open={tiroir} onOpenChange={setTiroir}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <MenuLateral entrees={entrees} onNavigue={() => setTiroir(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden min-w-0 md:block">
            <SelecteurBoutique />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="md:hidden">
              <SelecteurBoutique />
            </div>
            <PastilleConnexion />
            <MenuUtilisateur />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:px-6 md:pb-8">{children}</main>
      </div>

      <BarreMobile entrees={entrees} onPlus={() => setTiroir(true)} />
    </div>
  );
}
