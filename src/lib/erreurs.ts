/** Traduit les erreurs Supabase / Postgres en messages compréhensibles au comptoir. */
interface ErreurLike {
  code?: string;
  message?: string;
}

export function messageErreur(err: unknown): string {
  const e = (err ?? {}) as ErreurLike;
  const msg = e.message ?? "";
  if (e.code === "23505") return "Cet enregistrement existe déjà.";
  // Messages métier levés par la base (règles PREX'ING) : on les affiche tels quels.
  if (
    (e.code === "42501" || e.code === "22023" || e.code === "P0001" || e.code === "P0002") &&
    msg &&
    !/row-level security|permission denied/i.test(msg)
  )
    return msg;
  if (e.code === "42501" || /row-level security/i.test(msg))
    return "Vous n'avez pas les droits pour cette action.";
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return "Pas de connexion Internet. Réessayez quand la connexion revient.";
  if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(msg))
    return "Adresse email non confirmée. Ouvrez le lien reçu par email.";
  if (/User already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/Password should be at least/i.test(msg))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  return msg || "Une erreur est survenue.";
}

export function estDoublon(err: unknown): boolean {
  return (err as ErreurLike | null)?.code === "23505";
}
