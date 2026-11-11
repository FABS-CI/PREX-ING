export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abonnements_clients: {
        Row: {
          client_id: string
          consomme_kg: number
          consomme_pieces: number
          created_at: string
          debut: string
          deleted_at: string | null
          fin: string
          formule_id: string | null
          id: string
          pressing_id: string
          quota_kg: number | null
          quota_pieces: number | null
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          consomme_kg?: number
          consomme_pieces?: number
          created_at?: string
          debut?: string
          deleted_at?: string | null
          fin: string
          formule_id?: string | null
          id?: string
          pressing_id: string
          quota_kg?: number | null
          quota_pieces?: number | null
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          consomme_kg?: number
          consomme_pieces?: number
          created_at?: string
          debut?: string
          deleted_at?: string | null
          fin?: string
          formule_id?: string | null
          id?: string
          pressing_id?: string
          quota_kg?: number | null
          quota_pieces?: number | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_clients_formule_id_fkey"
            columns: ["formule_id"]
            isOneToOne: false
            referencedRelation: "formules_abonnement_client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonnements_clients_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          actif: boolean
          categorie_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          nom: string
          ordre: number
          pressing_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          nom: string
          ordre?: number
          pressing_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          nom?: string
          ordre?: number
          pressing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          pressing_id: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          pressing_id?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          pressing_id?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      avances: {
        Row: {
          created_at: string
          date: string
          deduite_salaire_id: string | null
          employe_id: string
          id: string
          montant: number
          note: string | null
          pressing_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          deduite_salaire_id?: string | null
          employe_id: string
          id?: string
          montant: number
          note?: string | null
          pressing_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          deduite_salaire_id?: string | null
          employe_id?: string
          id?: string
          montant?: number
          note?: string | null
          pressing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avances_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avances_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      boutiques: {
        Row: {
          actif: boolean
          adresse: string | null
          commune: string | null
          created_at: string
          deleted_at: string | null
          horaires: Json
          id: string
          nom: string
          parametres: Json
          pied_ticket: string | null
          prefixe: string
          pressing_id: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          commune?: string | null
          created_at?: string
          deleted_at?: string | null
          horaires?: Json
          id?: string
          nom: string
          parametres?: Json
          pied_ticket?: string | null
          prefixe?: string
          pressing_id: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          commune?: string | null
          created_at?: string
          deleted_at?: string | null
          horaires?: Json
          id?: string
          nom?: string
          parametres?: Json
          pied_ticket?: string | null
          prefixe?: string
          pressing_id?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutiques_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          nom: string
          ordre: number
          pressing_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom: string
          ordre?: number
          pressing_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom?: string
          ordre?: number
          pressing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          consentement_messages: boolean
          created_at: string
          date_naissance: string | null
          deleted_at: string | null
          id: string
          nom: string
          notes: string | null
          pressing_id: string
          quartier: string | null
          telephone: string
          telephone2: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          consentement_messages?: boolean
          created_at?: string
          date_naissance?: string | null
          deleted_at?: string | null
          id?: string
          nom: string
          notes?: string | null
          pressing_id: string
          quartier?: string | null
          telephone: string
          telephone2?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          consentement_messages?: boolean
          created_at?: string
          date_naissance?: string | null
          deleted_at?: string | null
          id?: string
          nom?: string
          notes?: string | null
          pressing_id?: string
          quartier?: string | null
          telephone?: string
          telephone2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes_en_ligne: {
        Row: {
          adresse: string | null
          articles: Json
          boutique_id: string
          client_id: string | null
          created_at: string
          creneau: string | null
          depot_id: string | null
          id: string
          pressing_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          articles?: Json
          boutique_id: string
          client_id?: string | null
          created_at?: string
          creneau?: string | null
          depot_id?: string | null
          id?: string
          pressing_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          articles?: Json
          boutique_id?: string
          client_id?: string | null
          created_at?: string
          creneau?: string | null
          depot_id?: string | null
          id?: string
          pressing_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commandes_en_ligne_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_en_ligne_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_en_ligne_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_en_ligne_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_en_ligne_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_en_ligne_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      depenses: {
        Row: {
          boutique_id: string
          categorie: string
          created_at: string
          date: string
          deleted_at: string | null
          fournisseur_id: string | null
          id: string
          justificatif_url: string | null
          libelle: string | null
          montant: number
          moyen: Database["public"]["Enums"]["moyen_paiement"]
          par: string | null
          pressing_id: string
          session_caisse_id: string | null
          updated_at: string
        }
        Insert: {
          boutique_id: string
          categorie: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          fournisseur_id?: string | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          montant: number
          moyen?: Database["public"]["Enums"]["moyen_paiement"]
          par?: string | null
          pressing_id: string
          session_caisse_id?: string | null
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          categorie?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          fournisseur_id?: string | null
          id?: string
          justificatif_url?: string | null
          libelle?: string | null
          montant?: number
          moyen?: Database["public"]["Enums"]["moyen_paiement"]
          par?: string | null
          pressing_id?: string
          session_caisse_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_session_caisse_id_fkey"
            columns: ["session_caisse_id"]
            isOneToOne: false
            referencedRelation: "sessions_caisse"
            referencedColumns: ["id"]
          },
        ]
      }
      depot_historique: {
        Row: {
          ancien: Database["public"]["Enums"]["statut_depot"] | null
          created_at: string
          depot_id: string
          id: string
          nouveau: Database["public"]["Enums"]["statut_depot"]
          par: string | null
          pressing_id: string
        }
        Insert: {
          ancien?: Database["public"]["Enums"]["statut_depot"] | null
          created_at?: string
          depot_id: string
          id?: string
          nouveau: Database["public"]["Enums"]["statut_depot"]
          par?: string | null
          pressing_id: string
        }
        Update: {
          ancien?: Database["public"]["Enums"]["statut_depot"] | null
          created_at?: string
          depot_id?: string
          id?: string
          nouveau?: Database["public"]["Enums"]["statut_depot"]
          par?: string | null
          pressing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depot_historique_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_historique_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_historique_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_historique_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      depot_lignes: {
        Row: {
          article_id: string | null
          boutique_id: string
          created_at: string
          deleted_at: string | null
          depot_id: string
          etiquette: string | null
          id: string
          libelle: string
          observations: string | null
          photo_url: string | null
          poids_kg: number | null
          pressing_id: string
          prix_unitaire: number
          quantite: number
          service_id: string | null
          statut: Database["public"]["Enums"]["statut_depot"]
          total: number
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          boutique_id: string
          created_at?: string
          deleted_at?: string | null
          depot_id: string
          etiquette?: string | null
          id?: string
          libelle: string
          observations?: string | null
          photo_url?: string | null
          poids_kg?: number | null
          pressing_id: string
          prix_unitaire?: number
          quantite?: number
          service_id?: string | null
          statut?: Database["public"]["Enums"]["statut_depot"]
          total?: number
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          boutique_id?: string
          created_at?: string
          deleted_at?: string | null
          depot_id?: string
          etiquette?: string | null
          id?: string
          libelle?: string
          observations?: string | null
          photo_url?: string | null
          poids_kg?: number | null
          pressing_id?: string
          prix_unitaire?: number
          quantite?: number
          service_id?: string | null
          statut?: Database["public"]["Enums"]["statut_depot"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depot_lignes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_lignes_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_lignes_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_lignes_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_lignes_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depot_lignes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      depots: {
        Row: {
          abonnement_client_id: string | null
          annule_motif: string | null
          avec_livraison: boolean
          boutique_id: string
          client_id: string
          created_at: string
          cree_par: string | null
          date_retrait_prevue: string | null
          deja_paye: number
          deleted_at: string | null
          emplacement: string | null
          express: boolean
          forfait_id: string | null
          frais_livraison: number
          id: string
          mode: Database["public"]["Enums"]["mode_facturation"]
          net_a_payer: number
          numero: string
          observations: string | null
          pressing_id: string
          remise: number
          reste_a_payer: number
          retire_le: string | null
          statut: Database["public"]["Enums"]["statut_depot"]
          statut_paiement: Database["public"]["Enums"]["statut_paiement_depot"]
          total_ht: number
          updated_at: string
        }
        Insert: {
          abonnement_client_id?: string | null
          annule_motif?: string | null
          avec_livraison?: boolean
          boutique_id: string
          client_id: string
          created_at?: string
          cree_par?: string | null
          date_retrait_prevue?: string | null
          deja_paye?: number
          deleted_at?: string | null
          emplacement?: string | null
          express?: boolean
          forfait_id?: string | null
          frais_livraison?: number
          id?: string
          mode?: Database["public"]["Enums"]["mode_facturation"]
          net_a_payer?: number
          numero: string
          observations?: string | null
          pressing_id: string
          remise?: number
          reste_a_payer?: number
          retire_le?: string | null
          statut?: Database["public"]["Enums"]["statut_depot"]
          statut_paiement?: Database["public"]["Enums"]["statut_paiement_depot"]
          total_ht?: number
          updated_at?: string
        }
        Update: {
          abonnement_client_id?: string | null
          annule_motif?: string | null
          avec_livraison?: boolean
          boutique_id?: string
          client_id?: string
          created_at?: string
          cree_par?: string | null
          date_retrait_prevue?: string | null
          deja_paye?: number
          deleted_at?: string | null
          emplacement?: string | null
          express?: boolean
          forfait_id?: string | null
          frais_livraison?: number
          id?: string
          mode?: Database["public"]["Enums"]["mode_facturation"]
          net_a_payer?: number
          numero?: string
          observations?: string | null
          pressing_id?: string
          remise?: number
          reste_a_payer?: number
          retire_le?: string | null
          statut?: Database["public"]["Enums"]["statut_depot"]
          statut_paiement?: Database["public"]["Enums"]["statut_paiement_depot"]
          total_ht?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depots_abonnement_client_id_fkey"
            columns: ["abonnement_client_id"]
            isOneToOne: false
            referencedRelation: "abonnements_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_forfait_id_fkey"
            columns: ["forfait_id"]
            isOneToOne: false
            referencedRelation: "forfaits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      employes: {
        Row: {
          actif: boolean
          boutique_id: string | null
          created_at: string
          date_embauche: string | null
          deleted_at: string | null
          id: string
          montant_base: number
          nom: string
          poste: string | null
          pressing_id: string
          telephone: string | null
          type_remuneration: Database["public"]["Enums"]["type_remuneration"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actif?: boolean
          boutique_id?: string | null
          created_at?: string
          date_embauche?: string | null
          deleted_at?: string | null
          id?: string
          montant_base?: number
          nom: string
          poste?: string | null
          pressing_id: string
          telephone?: string | null
          type_remuneration?: Database["public"]["Enums"]["type_remuneration"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actif?: boolean
          boutique_id?: string | null
          created_at?: string
          date_embauche?: string | null
          deleted_at?: string | null
          id?: string
          montant_base?: number
          nom?: string
          poste?: string | null
          pressing_id?: string
          telephone?: string | null
          type_remuneration?: Database["public"]["Enums"]["type_remuneration"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employes_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employes_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forfaits: {
        Row: {
          actif: boolean
          contenu: Json
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          nom: string
          pressing_id: string
          prix: number
          updated_at: string
          validite_jours: number | null
        }
        Insert: {
          actif?: boolean
          contenu?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          nom: string
          pressing_id: string
          prix: number
          updated_at?: string
          validite_jours?: number | null
        }
        Update: {
          actif?: boolean
          contenu?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          nom?: string
          pressing_id?: string
          prix?: number
          updated_at?: string
          validite_jours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forfaits_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      formules_abonnement_client: {
        Row: {
          actif: boolean
          created_at: string
          deleted_at: string | null
          duree_jours: number
          id: string
          nom: string
          pressing_id: string
          prix: number
          quota_kg: number | null
          quota_pieces: number | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          deleted_at?: string | null
          duree_jours?: number
          id?: string
          nom: string
          pressing_id: string
          prix: number
          quota_kg?: number | null
          quota_pieces?: number | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          deleted_at?: string | null
          duree_jours?: number
          id?: string
          nom?: string
          pressing_id?: string
          prix?: number
          quota_kg?: number | null
          quota_pieces?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formules_abonnement_client_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nom: string
          notes: string | null
          pressing_id: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom: string
          notes?: string | null
          pressing_id: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom?: string
          notes?: string | null
          pressing_id?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseurs_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      livraisons: {
        Row: {
          adresse: string
          boutique_id: string
          client_id: string
          code_confirmation: string | null
          created_at: string
          creneau_debut: string | null
          creneau_fin: string | null
          deleted_at: string | null
          depot_id: string | null
          frais: number
          id: string
          livreur_id: string | null
          motif_echec: string | null
          pressing_id: string
          preuve_url: string | null
          repere: string | null
          statut: Database["public"]["Enums"]["statut_livraison"]
          type: Database["public"]["Enums"]["type_livraison"]
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          adresse: string
          boutique_id: string
          client_id: string
          code_confirmation?: string | null
          created_at?: string
          creneau_debut?: string | null
          creneau_fin?: string | null
          deleted_at?: string | null
          depot_id?: string | null
          frais?: number
          id?: string
          livreur_id?: string | null
          motif_echec?: string | null
          pressing_id: string
          preuve_url?: string | null
          repere?: string | null
          statut?: Database["public"]["Enums"]["statut_livraison"]
          type: Database["public"]["Enums"]["type_livraison"]
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          adresse?: string
          boutique_id?: string
          client_id?: string
          code_confirmation?: string | null
          created_at?: string
          creneau_debut?: string | null
          creneau_fin?: string | null
          deleted_at?: string | null
          depot_id?: string | null
          frais?: number
          id?: string
          livreur_id?: string | null
          motif_echec?: string | null
          pressing_id?: string
          preuve_url?: string | null
          repere?: string | null
          statut?: Database["public"]["Enums"]["statut_livraison"]
          type?: Database["public"]["Enums"]["type_livraison"]
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livraisons_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_livreur_id_fkey"
            columns: ["livreur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livraisons_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones_livraison"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          actif: boolean
          boutique_ids: string[] | null
          created_at: string
          id: string
          pin_hash: string | null
          plafond_remise_pct: number
          pressing_id: string
          role: Database["public"]["Enums"]["role_membre"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          boutique_ids?: string[] | null
          created_at?: string
          id?: string
          pin_hash?: string | null
          plafond_remise_pct?: number
          pressing_id: string
          role: Database["public"]["Enums"]["role_membre"]
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          boutique_ids?: string[] | null
          created_at?: string
          id?: string
          pin_hash?: string | null
          plafond_remise_pct?: number
          pressing_id?: string
          role?: Database["public"]["Enums"]["role_membre"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          boutique_id: string | null
          canal: Database["public"]["Enums"]["canal_message"]
          client_id: string | null
          contenu: string
          cout: number | null
          created_at: string
          depot_id: string | null
          envoye_le: string | null
          erreur: string | null
          id: string
          pressing_id: string
          statut: Database["public"]["Enums"]["statut_message"]
          updated_at: string
        }
        Insert: {
          boutique_id?: string | null
          canal: Database["public"]["Enums"]["canal_message"]
          client_id?: string | null
          contenu: string
          cout?: number | null
          created_at?: string
          depot_id?: string | null
          envoye_le?: string | null
          erreur?: string | null
          id?: string
          pressing_id: string
          statut?: Database["public"]["Enums"]["statut_message"]
          updated_at?: string
        }
        Update: {
          boutique_id?: string | null
          canal?: Database["public"]["Enums"]["canal_message"]
          client_id?: string | null
          contenu?: string
          cout?: number | null
          created_at?: string
          depot_id?: string | null
          envoye_le?: string | null
          erreur?: string | null
          id?: string
          pressing_id?: string
          statut?: Database["public"]["Enums"]["statut_message"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_messages: {
        Row: {
          actif: boolean
          canal: Database["public"]["Enums"]["canal_message"]
          code: string
          contenu: string
          created_at: string
          id: string
          pressing_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          canal?: Database["public"]["Enums"]["canal_message"]
          code: string
          contenu: string
          created_at?: string
          id?: string
          pressing_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          canal?: Database["public"]["Enums"]["canal_message"]
          code?: string
          contenu?: string
          created_at?: string
          id?: string
          pressing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modeles_messages_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements_caisse: {
        Row: {
          boutique_id: string
          created_at: string
          depense_id: string | null
          id: string
          montant: number
          motif: string
          par: string | null
          pressing_id: string
          salaire_id: string | null
          session_caisse_id: string
          type: Database["public"]["Enums"]["type_mouvement"]
          updated_at: string
        }
        Insert: {
          boutique_id: string
          created_at?: string
          depense_id?: string | null
          id?: string
          montant: number
          motif: string
          par?: string | null
          pressing_id: string
          salaire_id?: string | null
          session_caisse_id: string
          type: Database["public"]["Enums"]["type_mouvement"]
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          created_at?: string
          depense_id?: string | null
          id?: string
          montant?: number
          motif?: string
          par?: string | null
          pressing_id?: string
          salaire_id?: string | null
          session_caisse_id?: string
          type?: Database["public"]["Enums"]["type_mouvement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_caisse_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caisse_depense_id_fkey"
            columns: ["depense_id"]
            isOneToOne: false
            referencedRelation: "depenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caisse_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caisse_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caisse_salaire_id_fkey"
            columns: ["salaire_id"]
            isOneToOne: false
            referencedRelation: "salaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caisse_session_caisse_id_fkey"
            columns: ["session_caisse_id"]
            isOneToOne: false
            referencedRelation: "sessions_caisse"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements_stock: {
        Row: {
          boutique_id: string
          cout_unitaire: number | null
          created_at: string
          fournisseur_id: string | null
          id: string
          note: string | null
          par: string | null
          pressing_id: string
          produit_id: string
          quantite: number
          type: Database["public"]["Enums"]["type_mouvement"]
          updated_at: string
        }
        Insert: {
          boutique_id: string
          cout_unitaire?: number | null
          created_at?: string
          fournisseur_id?: string | null
          id?: string
          note?: string | null
          par?: string | null
          pressing_id: string
          produit_id: string
          quantite: number
          type: Database["public"]["Enums"]["type_mouvement"]
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          cout_unitaire?: number | null
          created_at?: string
          fournisseur_id?: string | null
          id?: string
          note?: string | null
          par?: string | null
          pressing_id?: string
          produit_id?: string
          quantite?: number
          type?: Database["public"]["Enums"]["type_mouvement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_produits"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          boutique_id: string
          client_id: string | null
          created_at: string
          depot_id: string | null
          encaisse_par: string | null
          id: string
          montant: number
          moyen: Database["public"]["Enums"]["moyen_paiement"]
          pressing_id: string
          reference_agregateur: string | null
          reference_operateur: string | null
          session_caisse_id: string | null
          statut: Database["public"]["Enums"]["statut_paiement"]
          updated_at: string
        }
        Insert: {
          boutique_id: string
          client_id?: string | null
          created_at?: string
          depot_id?: string | null
          encaisse_par?: string | null
          id?: string
          montant: number
          moyen: Database["public"]["Enums"]["moyen_paiement"]
          pressing_id: string
          reference_agregateur?: string | null
          reference_operateur?: string | null
          session_caisse_id?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          client_id?: string | null
          created_at?: string
          depot_id?: string | null
          encaisse_par?: string | null
          id?: string
          montant?: number
          moyen?: Database["public"]["Enums"]["moyen_paiement"]
          pressing_id?: string
          reference_agregateur?: string | null
          reference_operateur?: string | null
          session_caisse_id?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "v_depots_en_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_encaisse_par_fkey"
            columns: ["encaisse_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_session_caisse_id_fkey"
            columns: ["session_caisse_id"]
            isOneToOne: false
            referencedRelation: "sessions_caisse"
            referencedColumns: ["id"]
          },
        ]
      }
      pointages: {
        Row: {
          arrivee: string
          created_at: string
          depart: string | null
          employe_id: string
          id: string
          note: string | null
          pressing_id: string
          type: string
          updated_at: string
        }
        Insert: {
          arrivee?: string
          created_at?: string
          depart?: string | null
          employe_id: string
          id?: string
          note?: string | null
          pressing_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          arrivee?: string
          created_at?: string
          depart?: string | null
          employe_id?: string
          id?: string
          note?: string | null
          pressing_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pointages_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pointages_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      pressings: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          echeance: string | null
          email: string | null
          essai_fin: string
          formule: string
          id: string
          logo_url: string | null
          nom: string
          rccm: string | null
          statut_abonnement: Database["public"]["Enums"]["statut_abonnement_saas"]
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          echeance?: string | null
          email?: string | null
          essai_fin?: string
          formule?: string
          id?: string
          logo_url?: string | null
          nom: string
          rccm?: string | null
          statut_abonnement?: Database["public"]["Enums"]["statut_abonnement_saas"]
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          echeance?: string | null
          email?: string | null
          essai_fin?: string
          formule?: string
          id?: string
          logo_url?: string | null
          nom?: string
          rccm?: string | null
          statut_abonnement?: Database["public"]["Enums"]["statut_abonnement_saas"]
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pressings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prix_kilo: {
        Row: {
          boutique_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          poids_min: number
          pressing_id: string
          prix_kg: number
          service_id: string
          updated_at: string
        }
        Insert: {
          boutique_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          poids_min?: number
          pressing_id: string
          prix_kg: number
          service_id: string
          updated_at?: string
        }
        Update: {
          boutique_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          poids_min?: number
          pressing_id?: string
          prix_kg?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prix_kilo_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prix_kilo_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prix_kilo_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_super_admin: boolean
          nom: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_super_admin?: boolean
          nom?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super_admin?: boolean
          nom?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salaires: {
        Row: {
          avances: number
          base: number
          created_at: string
          employe_id: string
          id: string
          mois: string
          moyen: Database["public"]["Enums"]["moyen_paiement"] | null
          net: number | null
          paye_le: string | null
          pressing_id: string
          primes: number
          retenues: number
          updated_at: string
        }
        Insert: {
          avances?: number
          base?: number
          created_at?: string
          employe_id: string
          id?: string
          mois: string
          moyen?: Database["public"]["Enums"]["moyen_paiement"] | null
          net?: number | null
          paye_le?: string | null
          pressing_id: string
          primes?: number
          retenues?: number
          updated_at?: string
        }
        Update: {
          avances?: number
          base?: number
          created_at?: string
          employe_id?: string
          id?: string
          mois?: string
          moyen?: Database["public"]["Enums"]["moyen_paiement"] | null
          net?: number | null
          paye_le?: string | null
          pressing_id?: string
          primes?: number
          retenues?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salaires_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaires_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          actif: boolean
          created_at: string
          delai_jours: number
          deleted_at: string | null
          id: string
          majoration_express_pct: number
          nom: string
          ordre: number
          pressing_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          delai_jours?: number
          deleted_at?: string | null
          id?: string
          majoration_express_pct?: number
          nom: string
          ordre?: number
          pressing_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          delai_jours?: number
          deleted_at?: string | null
          id?: string
          majoration_express_pct?: number
          nom?: string
          ordre?: number
          pressing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_caisse: {
        Row: {
          boutique_id: string
          cloture_le: string | null
          cloture_par: string | null
          commentaire: string | null
          created_at: string
          ecart: number | null
          fond_initial: number
          id: string
          montant_compte: number | null
          montant_theorique: number | null
          ouvert_le: string
          ouvert_par: string | null
          pressing_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          boutique_id: string
          cloture_le?: string | null
          cloture_par?: string | null
          commentaire?: string | null
          created_at?: string
          ecart?: number | null
          fond_initial?: number
          id?: string
          montant_compte?: number | null
          montant_theorique?: number | null
          ouvert_le?: string
          ouvert_par?: string | null
          pressing_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          cloture_le?: string | null
          cloture_par?: string | null
          commentaire?: string | null
          created_at?: string
          ecart?: number | null
          fond_initial?: number
          id?: string
          montant_compte?: number | null
          montant_theorique?: number | null
          ouvert_le?: string
          ouvert_par?: string | null
          pressing_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_caisse_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_caisse_cloture_par_fkey"
            columns: ["cloture_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_caisse_ouvert_par_fkey"
            columns: ["ouvert_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_caisse_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_produits: {
        Row: {
          boutique_id: string
          created_at: string
          deleted_at: string | null
          id: string
          nom: string
          pressing_id: string
          quantite: number
          seuil_alerte: number
          unite: string
          updated_at: string
        }
        Insert: {
          boutique_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom: string
          pressing_id: string
          quantite?: number
          seuil_alerte?: number
          unite?: string
          updated_at?: string
        }
        Update: {
          boutique_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nom?: string
          pressing_id?: string
          quantite?: number
          seuil_alerte?: number
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_produits_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifs: {
        Row: {
          article_id: string
          boutique_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          pressing_id: string
          prix: number
          service_id: string
          updated_at: string
        }
        Insert: {
          article_id: string
          boutique_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          pressing_id: string
          prix: number
          service_id: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          boutique_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          pressing_id?: string
          prix?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifs_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifs_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      zones_livraison: {
        Row: {
          communes: string[]
          created_at: string
          deleted_at: string | null
          frais: number
          id: string
          nom: string
          pressing_id: string
          seuil_gratuite: number | null
          updated_at: string
        }
        Insert: {
          communes?: string[]
          created_at?: string
          deleted_at?: string | null
          frais?: number
          id?: string
          nom: string
          pressing_id: string
          seuil_gratuite?: number | null
          updated_at?: string
        }
        Update: {
          communes?: string[]
          created_at?: string
          deleted_at?: string | null
          frais?: number
          id?: string
          nom?: string
          pressing_id?: string
          seuil_gratuite?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_livraison_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_clients_soldes: {
        Row: {
          derniere_visite: string | null
          id: string | null
          nb_depots: number | null
          nom: string | null
          pressing_id: string | null
          solde_du: number | null
          telephone: string | null
          total_depense: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
      v_depots_en_retard: {
        Row: {
          abonnement_client_id: string | null
          annule_motif: string | null
          avec_livraison: boolean | null
          boutique_id: string | null
          client_id: string | null
          client_nom: string | null
          client_telephone: string | null
          created_at: string | null
          cree_par: string | null
          date_retrait_prevue: string | null
          deja_paye: number | null
          deleted_at: string | null
          emplacement: string | null
          express: boolean | null
          forfait_id: string | null
          frais_livraison: number | null
          id: string | null
          jours_retard: number | null
          mode: Database["public"]["Enums"]["mode_facturation"] | null
          net_a_payer: number | null
          numero: string | null
          observations: string | null
          pressing_id: string | null
          remise: number | null
          reste_a_payer: number | null
          retire_le: string | null
          statut: Database["public"]["Enums"]["statut_depot"] | null
          statut_paiement:
            | Database["public"]["Enums"]["statut_paiement_depot"]
            | null
          total_ht: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depots_abonnement_client_id_fkey"
            columns: ["abonnement_client_id"]
            isOneToOne: false
            referencedRelation: "abonnements_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_soldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_forfait_id_fkey"
            columns: ["forfait_id"]
            isOneToOne: false
            referencedRelation: "forfaits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_pressing_id_fkey"
            columns: ["pressing_id"]
            isOneToOne: false
            referencedRelation: "pressings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      caisse_theorique: { Args: { p_session: string }; Returns: number }
      can_access: {
        Args: { p_boutique: string; p_pressing: string }
        Returns: boolean
      }
      can_operate: {
        Args: { p_boutique: string; p_pressing: string }
        Returns: boolean
      }
      cloturer_caisse: {
        Args: {
          p_commentaire?: string
          p_montant_compte: number
          p_session: string
        }
        Returns: {
          boutique_id: string
          cloture_le: string | null
          cloture_par: string | null
          commentaire: string | null
          created_at: string
          ecart: number | null
          fond_initial: number
          id: string
          montant_compte: number | null
          montant_theorique: number | null
          ouvert_le: string
          ouvert_par: string | null
          pressing_id: string
          statut: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions_caisse"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      creer_pressing: {
        Args: {
          p_boutique_nom?: string
          p_commune?: string
          p_nom: string
          p_telephone: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          p_pressing: string
          p_roles: Database["public"]["Enums"]["role_membre"][]
        }
        Returns: boolean
      }
      is_member: { Args: { p_pressing: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mon_role: {
        Args: { p_pressing: string }
        Returns: Database["public"]["Enums"]["role_membre"]
      }
    }
    Enums: {
      canal_message: "whatsapp" | "sms"
      mode_facturation: "article" | "kilo" | "forfait" | "abonnement"
      moyen_paiement:
        | "especes"
        | "wave"
        | "orange_money"
        | "mtn_momo"
        | "moov_money"
        | "carte"
        | "autre"
      role_membre: "proprietaire" | "gerant" | "caissier" | "livreur"
      statut_abonnement_saas:
        | "essai"
        | "actif"
        | "grace"
        | "lecture_seule"
        | "suspendu"
      statut_depot:
        | "en_attente"
        | "recu"
        | "en_traitement"
        | "pret"
        | "en_livraison"
        | "retire"
        | "annule"
      statut_livraison:
        | "demande"
        | "planifie"
        | "en_cours"
        | "effectue"
        | "echoue"
        | "annule"
      statut_message: "en_attente" | "envoye" | "distribue" | "echoue"
      statut_paiement: "valide" | "a_verifier" | "echoue" | "annule"
      statut_paiement_depot: "non_solde" | "partiel" | "solde"
      type_livraison: "ramassage" | "livraison"
      type_mouvement: "entree" | "sortie"
      type_remuneration: "mensuel" | "journalier" | "piece" | "commission"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canal_message: ["whatsapp", "sms"],
      mode_facturation: ["article", "kilo", "forfait", "abonnement"],
      moyen_paiement: [
        "especes",
        "wave",
        "orange_money",
        "mtn_momo",
        "moov_money",
        "carte",
        "autre",
      ],
      role_membre: ["proprietaire", "gerant", "caissier", "livreur"],
      statut_abonnement_saas: [
        "essai",
        "actif",
        "grace",
        "lecture_seule",
        "suspendu",
      ],
      statut_depot: [
        "en_attente",
        "recu",
        "en_traitement",
        "pret",
        "en_livraison",
        "retire",
        "annule",
      ],
      statut_livraison: [
        "demande",
        "planifie",
        "en_cours",
        "effectue",
        "echoue",
        "annule",
      ],
      statut_message: ["en_attente", "envoye", "distribue", "echoue"],
      statut_paiement: ["valide", "a_verifier", "echoue", "annule"],
      statut_paiement_depot: ["non_solde", "partiel", "solde"],
      type_livraison: ["ramassage", "livraison"],
      type_mouvement: ["entree", "sortie"],
      type_remuneration: ["mensuel", "journalier", "piece", "commission"],
    },
  },
} as const
