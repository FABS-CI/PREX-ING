/** Types des lignes de la base (schéma : database/20261111000001_init.sql). */

export type Role = "proprietaire" | "gerant" | "caissier" | "livreur";
export type ModeFacturation = "article" | "kilo" | "forfait" | "abonnement";
export type StatutDepot =
  "en_attente" | "recu" | "en_traitement" | "pret" | "en_livraison" | "retire" | "annule";
export type StatutPaiementDepot = "non_solde" | "partiel" | "solde";
export type MoyenPaiement =
  "especes" | "wave" | "orange_money" | "mtn_momo" | "moov_money" | "carte" | "autre";
export type StatutPaiement = "valide" | "a_verifier" | "echoue" | "annule";

export interface Profil {
  id: string;
  nom: string;
  telephone: string | null;
}

export interface Pressing {
  id: string;
  nom: string;
  telephone: string | null;
  logo_url?: string | null;
}

export interface Boutique {
  id: string;
  pressing_id: string;
  nom: string;
  adresse: string | null;
  commune: string | null;
  telephone: string | null;
  prefixe: string;
  pied_ticket: string | null;
  actif: boolean;
}

export interface Membership {
  id: string;
  pressing_id: string;
  user_id: string;
  role: Role;
  boutique_ids: string[] | null;
  plafond_remise_pct: number;
  actif: boolean;
}

export interface Client {
  id: string;
  pressing_id: string;
  nom: string;
  telephone: string;
  telephone2: string | null;
  adresse: string | null;
  quartier: string | null;
  notes: string | null;
  date_naissance: string | null;
  consentement_messages: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface ClientSolde {
  id: string;
  pressing_id: string;
  nom: string;
  telephone: string;
  nb_depots: number;
  total_depense: number;
  solde_du: number;
  derniere_visite: string | null;
}

export interface Categorie {
  id: string;
  nom: string;
  ordre: number;
}

export interface Article {
  id: string;
  categorie_id: string | null;
  nom: string;
  image_url: string | null;
  ordre: number;
  actif: boolean;
}

export interface Service {
  id: string;
  nom: string;
  delai_jours: number;
  majoration_express_pct: number;
  ordre: number;
  actif: boolean;
}

export interface Tarif {
  id: string;
  article_id: string;
  service_id: string;
  boutique_id: string | null;
  prix: number;
}

export interface Depot {
  id: string;
  pressing_id: string;
  boutique_id: string;
  client_id: string;
  numero: string;
  mode: ModeFacturation;
  statut: StatutDepot;
  statut_paiement: StatutPaiementDepot;
  total_ht: number;
  remise: number;
  frais_livraison: number;
  net_a_payer: number;
  deja_paye: number;
  reste_a_payer: number;
  express: boolean;
  date_retrait_prevue: string | null;
  emplacement: string | null;
  observations: string | null;
  created_at: string;
}

export interface DepotLigne {
  id: string;
  depot_id: string;
  libelle: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
  observations: string | null;
  etiquette: string | null;
  poids_kg?: number | null;
  prix_lot?: number | null;
  couvert_abonnement?: boolean | null;
}

export interface Paiement {
  id: string;
  depot_id: string | null;
  montant: number;
  moyen: MoyenPaiement;
  statut: StatutPaiement;
  reference_operateur: string | null;
  created_at: string;
}

export interface AbonnementClient {
  id: string;
  quota_pieces: number | null;
  quota_kg: number | null;
  consomme_pieces: number;
  consomme_kg: number;
  debut: string;
  fin: string;
  statut: "actif" | "epuise" | "expire" | "annule";
}

export const LIBELLES_ROLE: Record<Role, string> = {
  proprietaire: "Propriétaire",
  gerant: "Gérant",
  caissier: "Caissier",
  livreur: "Livreur",
};

export const LIBELLES_STATUT_DEPOT: Record<StatutDepot, string> = {
  en_attente: "En attente",
  recu: "Reçu",
  en_traitement: "En traitement",
  pret: "Prêt",
  en_livraison: "En livraison",
  retire: "Retiré",
  annule: "Annulé",
};

export const LIBELLES_STATUT_PAIEMENT: Record<StatutPaiementDepot, string> = {
  non_solde: "Non soldé",
  partiel: "Partiel",
  solde: "Soldé",
};

export const LIBELLES_MOYEN: Record<MoyenPaiement, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  carte: "Carte",
  autre: "Autre",
};

export const LIBELLES_STATUT_PAIEMENT_LIGNE: Record<StatutPaiement, string> = {
  valide: "Validé",
  a_verifier: "À vérifier",
  echoue: "Échoué",
  annule: "Annulé",
};
