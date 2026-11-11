import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Boutique, Membership, Pressing, Profil, Role } from "@/lib/types";

const CLE_BOUTIQUE = "prexing.boutique";

type EtatChargement = "chargement" | "deconnecte" | "sans_pressing" | "pret" | "erreur";

interface SessionValeur {
  etat: EtatChargement;
  erreur: string | null;
  session: Session | null;
  user: User | null;
  profil: Profil | null;
  membership: Membership | null;
  pressing: Pressing | null;
  role: Role | null;
  boutiques: Boutique[];
  boutique: Boutique | null;
  choisirBoutique: (id: string) => void;
  recharger: () => Promise<void>;
  deconnexion: () => Promise<void>;
  /** Plafond de remise en % (null = illimité pour le propriétaire). */
  plafondRemise: number | null;
  peut: (action: Permission) => boolean;
}

export type Permission =
  "gerer_catalogue" | "supprimer" | "voir_equipe" | "voir_parametres" | "voir_rapports";

const PERMISSIONS: Record<Permission, Role[]> = {
  gerer_catalogue: ["proprietaire", "gerant"],
  supprimer: ["proprietaire", "gerant"],
  voir_equipe: ["proprietaire"],
  voir_parametres: ["proprietaire"],
  voir_rapports: ["proprietaire", "gerant"],
};

const SessionContext = createContext<SessionValeur | null>(null);

type MembershipAvecPressing = Membership & { pressings: Pressing | null };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [etat, setEtat] = useState<EtatChargement>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [pressing, setPressing] = useState<Pressing | null>(null);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [boutiqueId, setBoutiqueId] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(CLE_BOUTIQUE) : null;
    } catch {
      return null;
    }
  });

  const chargerDonnees = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      setMembership(null);
      setPressing(null);
      setBoutiques([]);
      setEtat("deconnecte");
      return;
    }
    try {
      setErreur(null);
      const [profilRes, membresRes] = await Promise.all([
        supabase.from("profiles").select("id, nom, telephone").eq("id", s.user.id).maybeSingle(),
        supabase
          .from("memberships")
          .select("*, pressings(id, nom, telephone, logo_url)")
          .eq("user_id", s.user.id)
          .eq("actif", true)
          .order("created_at", { ascending: true }),
      ]);
      if (profilRes.error) throw profilRes.error;
      if (membresRes.error) throw membresRes.error;
      setProfil((profilRes.data as Profil | null) ?? null);

      const membres = (membresRes.data ?? []) as MembershipAvecPressing[];
      const m = membres[0];
      if (!m || !m.pressings) {
        setMembership(null);
        setPressing(null);
        setBoutiques([]);
        setEtat("sans_pressing");
        return;
      }
      const { pressings, ...reste } = m;
      setMembership(reste);
      setPressing(pressings);

      const boutiquesRes = await supabase
        .from("boutiques")
        .select("*")
        .eq("pressing_id", m.pressing_id)
        .eq("actif", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (boutiquesRes.error) throw boutiquesRes.error;
      setBoutiques((boutiquesRes.data ?? []) as Boutique[]);
      setEtat("pret");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger votre compte.");
      setEtat("erreur");
    }
  }, []);

  useEffect(() => {
    let actif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      setSession(data.session);
      void chargerDonnees(data.session);
    });
    const { data: abonnement } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (!actif) return;
      setSession(s);
      // Le rafraîchissement du jeton ne change pas le compte : pas de rechargement.
      if (evenement === "SIGNED_IN" || evenement === "SIGNED_OUT" || evenement === "USER_UPDATED") {
        // Différé pour ne pas appeler Supabase à l'intérieur du rappel d'authentification.
        setTimeout(() => void chargerDonnees(s), 0);
      }
    });
    return () => {
      actif = false;
      abonnement.subscription.unsubscribe();
    };
  }, [chargerDonnees]);

  const boutique = useMemo(
    () => boutiques.find((b) => b.id === boutiqueId) ?? boutiques[0] ?? null,
    [boutiques, boutiqueId],
  );

  const choisirBoutique = useCallback((id: string) => {
    setBoutiqueId(id);
    try {
      window.localStorage.setItem(CLE_BOUTIQUE, id);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const recharger = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await chargerDonnees(data.session);
  }, [chargerDonnees]);

  const deconnexion = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const role = membership?.role ?? null;

  const valeur = useMemo<SessionValeur>(
    () => ({
      etat,
      erreur,
      session,
      user: session?.user ?? null,
      profil,
      membership,
      pressing,
      role,
      boutiques,
      boutique,
      choisirBoutique,
      recharger,
      deconnexion,
      plafondRemise: role === "proprietaire" ? null : Number(membership?.plafond_remise_pct ?? 0),
      peut: (action) => (role ? PERMISSIONS[action].includes(role) : false),
    }),
    [
      etat,
      erreur,
      session,
      profil,
      membership,
      pressing,
      role,
      boutiques,
      boutique,
      choisirBoutique,
      recharger,
      deconnexion,
    ],
  );

  return <SessionContext.Provider value={valeur}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValeur {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>.");
  return ctx;
}

/** Pour les pages internes : pressing et boutique sont garantis par la route _app. */
export function useEspace() {
  const s = useSession();
  if (!s.pressing || !s.boutique || !s.role || !s.user) {
    throw new Error("Espace PREX'ING non chargé.");
  }
  return { ...s, pressing: s.pressing, boutique: s.boutique, role: s.role, user: s.user };
}
