import { forwardRef, useState } from "react";
import { Search, TriangleAlert, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRechercheClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { formatFCFA, formatTelephone, initiales } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ClientChoisi {
  id: string;
  nom: string;
  telephone: string;
  solde_du: number;
  consentement_messages?: boolean;
}

interface Props {
  pressingId: string;
  client: ClientChoisi | null;
  onChoisir: (c: ClientChoisi | null) => void;
  onNouveau: (saisie: string) => void;
}

export const ChoixClient = forwardRef<HTMLInputElement, Props>(function ChoixClient(
  { pressingId, client, onChoisir, onNouveau },
  ref,
) {
  const [saisie, setSaisie] = useState("");
  const [actif, setActif] = useState(0);
  const recherche = useDebounce(saisie, 200);
  const { data: resultats = [], isFetching } = useRechercheClients(pressingId, recherche);
  const ouvert = saisie.trim().length >= 2;

  if (client) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initiales(client.nom)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{client.nom}</p>
          <p className="montant text-sm text-muted-foreground">
            {formatTelephone(client.telephone)}
          </p>
        </div>
        {client.solde_du > 0 ? (
          <span className="hidden items-center gap-1.5 rounded-lg bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-warning sm:inline-flex">
            <TriangleAlert className="size-3.5" />
            Doit déjà <span className="montant">{formatFCFA(client.solde_du)}</span>
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChoisir(null)}
          aria-label="Changer de client"
        >
          <X />
        </Button>
      </div>
    );
  }

  const choisir = (i: number) => {
    const c = resultats[i];
    if (!c) return;
    onChoisir({ id: c.id, nom: c.nom, telephone: c.telephone, solde_du: c.solde_du });
    setSaisie("");
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              setActif(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActif((a) => Math.min(a + 1, resultats.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActif((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && ouvert) {
                e.preventDefault();
                if (actif < resultats.length) choisir(actif);
                else onNouveau(saisie);
              }
            }}
            placeholder="Client : nom ou téléphone (F2)"
            className="h-12 pl-9 text-base"
            aria-label="Rechercher le client"
            autoComplete="off"
          />
        </div>
        <Button variant="outline" className="h-12 px-4" onClick={() => onNouveau(saisie)}>
          <UserPlus />
          <span className="hidden sm:inline">Nouveau (F4)</span>
        </Button>
      </div>

      {ouvert ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {resultats.length === 0 && !isFetching ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Aucun client trouvé.</p>
          ) : null}
          <ul role="listbox">
            {resultats.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choisir(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted",
                    i === actif && "bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.nom}</span>
                    <span className="montant block text-xs text-muted-foreground">
                      {formatTelephone(c.telephone)}
                    </span>
                  </span>
                  {c.solde_du > 0 ? (
                    <span className="montant text-xs font-semibold text-destructive">
                      {formatFCFA(c.solde_du)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onNouveau(saisie)}
                className={cn(
                  "flex w-full items-center gap-2 border-t px-4 py-3 text-left text-sm font-medium text-primary hover:bg-muted dark:text-info",
                  actif === resultats.length && "bg-muted",
                )}
              >
                <UserPlus className="size-4" />
                Créer « {saisie.trim()} »
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
});
