import { useState } from "react";

import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Billets et pièces en circulation (franc CFA BCEAO). */
export const COUPURES = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25, 10, 5];

export function totalCoupures(quantites: Record<number, number>): number {
  return COUPURES.reduce((a, c) => a + c * (quantites[c] ?? 0), 0);
}

/** Comptage du tiroir par coupures ; renvoie le total à chaque changement. */
export function Comptage({ onTotal }: { onTotal: (total: number) => void }) {
  const [q, setQ] = useState<Record<number, number>>({});
  const maj = (c: number, v: string) => {
    const suivant = { ...q, [c]: Number(v.replace(/\D/g, "")) || 0 };
    setQ(suivant);
    onTotal(totalCoupures(suivant));
  };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {COUPURES.map((c) => (
        <label key={c} className="flex items-center gap-2">
          <span
            className={cn(
              "montant w-14 shrink-0 text-right text-sm font-medium",
              c >= 500 && c !== 500 ? "" : "text-muted-foreground",
            )}
          >
            {formatFCFA(c, false)}
          </span>
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            inputMode="numeric"
            value={q[c] ? String(q[c]) : ""}
            placeholder="0"
            onChange={(e) => maj(c, e.target.value)}
            onFocus={(e) => e.target.select()}
            className="montant h-10 text-right"
            aria-label={`Nombre de ${c} FCFA`}
          />
        </label>
      ))}
    </div>
  );
}
