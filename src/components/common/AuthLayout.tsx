import type { ReactNode } from "react";

import { Logo } from "./Logo";
const supabaseConfigured = Boolean(import.meta.env['VITE_SUPABASE_URL']);

export function AuthLayout({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col">
        <Logo clair />
        <div className="mt-auto max-w-md">
          <p className="text-3xl leading-tight font-bold text-white">
            Chaque vêtement suivi, chaque franc compté.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">
            Comptoir, étiquettes, caisse et relances : PREX’ING tient le cahier de votre pressing,
            même quand Internet coupe.
          </p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          className="pointer-events-none absolute -top-16 -right-24 size-[420px] opacity-[0.07]"
        >
          <path
            d="M200 70a30 30 0 1 1 30 30c-12 0-30 8-30 24v12l118 84c12 8 6 28-8 28H90c-14 0-20-20-8-28l118-84"
            fill="none"
            stroke="white"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{titre}</h1>
          {sousTitre ? <p className="mt-1.5 text-sm text-muted-foreground">{sousTitre}</p> : null}
          {!supabaseConfigured ? (
            <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              La base de données n’est pas connectée. Dans Lovable, connectez le projet Supabase «
              prexing » (Integrations → Supabase).
            </p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
