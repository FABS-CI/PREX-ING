import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Champ de montant FCFA : chiffres seuls, séparateur de milliers à l'affichage. */
export function SaisieMontant({
  id,
  valeur,
  onChange,
  autoFocus,
  className,
}: {
  id: string;
  valeur: number;
  onChange: (n: number) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      value={valeur ? formatFCFA(valeur, false) : ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      onFocus={(e) => e.target.select()}
      className={cn("montant h-11 text-right text-base", className)}
      autoFocus={autoFocus}
    />
  );
}
