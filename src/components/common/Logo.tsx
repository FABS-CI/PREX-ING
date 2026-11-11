import { cn } from "@/lib/utils";

/** Logotype texte PREX'ING : cintre stylisé + nom. */
export function Logo({ className, clair = false }: { className?: string; clair?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className={clair ? "fill-white/10" : "fill-primary"} />
        <path
          d="M16 8.5a2.2 2.2 0 1 1 2.2 2.2c-.9 0-2.2.6-2.2 1.8v.9l8.6 6.1c.9.6.5 2-.6 2H8c-1.1 0-1.5-1.4-.6-2l8.6-6.1"
          fill="none"
          stroke="#0EA5E9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "text-lg font-extrabold tracking-tight",
          clair ? "text-white" : "text-primary dark:text-foreground",
        )}
      >
        PREX<span className="text-info">’</span>ING
      </span>
    </span>
  );
}
