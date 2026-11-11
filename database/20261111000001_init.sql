-- =====================================================================
-- PREX'ING — Migration initiale
-- Schéma multi-pressing (multi-tenant), multi-boutiques, prêt pour le hors ligne
--   * clés primaires UUID générables sur l'appareil (hors ligne)
--   * updated_at automatique, suppression logique (deleted_at)
--   * sécurité par lignes (RLS) : un pressing ne voit jamais les données d'un autre
--   * montants en FCFA entiers (pas de décimales)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Types énumérés
-- ---------------------------------------------------------------------
create type public.role_membre as enum ('proprietaire', 'gerant', 'caissier', 'livreur');
create type public.mode_facturation as enum ('article', 'kilo', 'forfait', 'abonnement');
create type public.statut_depot as enum ('en_attente', 'recu', 'en_traitement', 'pret', 'en_livraison', 'retire', 'annule');
create type public.statut_paiement_depot as enum ('non_solde', 'partiel', 'solde');
create type public.moyen_paiement as enum ('especes', 'wave', 'orange_money', 'mtn_momo', 'moov_money', 'carte', 'autre');
create type public.statut_paiement as enum ('valide', 'a_verifier', 'echoue', 'annule');
create type public.statut_abonnement_saas as enum ('essai', 'actif', 'grace', 'lecture_seule', 'suspendu');
create type public.type_livraison as enum ('ramassage', 'livraison');
create type public.statut_livraison as enum ('demande', 'planifie', 'en_cours', 'effectue', 'echoue', 'annule');
create type public.type_mouvement as enum ('entree', 'sortie');
create type public.canal_message as enum ('whatsapp', 'sms');
create type public.statut_message as enum ('en_attente', 'envoye', 'distribue', 'echoue');
create type public.type_remuneration as enum ('mensuel', 'journalier', 'piece', 'commission');

-- ---------------------------------------------------------------------
-- 2. Comptes, pressings, boutiques, membres
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text,
  telephone text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pressings (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  email text,
  logo_url text,
  rccm text,
  ville text default 'Abidjan',
  formule text not null default 'essai',
  statut_abonnement public.statut_abonnement_saas not null default 'essai',
  essai_fin date not null default (current_date + 14),
  echeance date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.boutiques (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  adresse text,
  commune text,
  telephone text,
  prefixe text not null default 'A',          -- préfixe des numéros de dépôt / étiquettes
  horaires jsonb not null default '{}'::jsonb,
  pied_ticket text default 'Merci de votre confiance !',
  parametres jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.role_membre not null,
  boutique_ids uuid[],                         -- null = toutes les boutiques
  plafond_remise_pct numeric(5,2) not null default 0,
  pin_hash text,                               -- code PIN comptoir (haché côté serveur)
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pressing_id, user_id)
);

-- ---------------------------------------------------------------------
-- 3. Clients et catalogue
-- ---------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  telephone text not null,
  telephone2 text,
  adresse text,
  quartier text,
  notes text,
  date_naissance date,
  consentement_messages boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index clients_tel_unique on public.clients (pressing_id, telephone) where deleted_at is null;
create index clients_nom_idx on public.clients (pressing_id, lower(nom));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  code text,
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  categorie_id uuid references public.categories (id) on delete set null,
  nom text not null,
  image_url text,
  ordre int not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  delai_jours int not null default 2,
  majoration_express_pct numeric(5,2) not null default 50,
  ordre int not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tarifs (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid references public.boutiques (id) on delete cascade,   -- null = tarif commun
  article_id uuid not null references public.articles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  prix int not null check (prix >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique nulls not distinct (article_id, service_id, boutique_id)
);

create table public.prix_kilo (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid references public.boutiques (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  prix_kg int not null check (prix_kg >= 0),
  poids_min numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique nulls not distinct (service_id, boutique_id)
);

create table public.forfaits (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  description text,
  contenu jsonb not null default '[]'::jsonb,   -- ex. [{"article_id": "...", "service_id": "...", "quantite": 10}]
  prix int not null check (prix >= 0),
  validite_jours int,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.formules_abonnement_client (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  quota_pieces int,
  quota_kg numeric(8,2),
  prix int not null check (prix >= 0),
  duree_jours int not null default 30,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.abonnements_clients (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  formule_id uuid references public.formules_abonnement_client (id) on delete set null,
  quota_pieces int,
  quota_kg numeric(8,2),
  consomme_pieces int not null default 0,
  consomme_kg numeric(8,2) not null default 0,
  debut date not null default current_date,
  fin date not null,
  statut text not null default 'actif' check (statut in ('actif', 'epuise', 'expire', 'annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- 4. Dépôts
-- ---------------------------------------------------------------------
create table public.depots (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  client_id uuid not null references public.clients (id),
  numero text not null,                        -- généré sur l'appareil : PREFIXE-APPAREIL-COMPTEUR
  mode public.mode_facturation not null default 'article',
  statut public.statut_depot not null default 'recu',
  statut_paiement public.statut_paiement_depot not null default 'non_solde',
  total_ht int not null default 0,             -- calculé à partir des lignes
  remise int not null default 0 check (remise >= 0),
  frais_livraison int not null default 0 check (frais_livraison >= 0),
  net_a_payer int not null default 0,          -- calculé
  deja_paye int not null default 0,            -- calculé à partir des paiements validés
  reste_a_payer int not null default 0,        -- calculé
  express boolean not null default false,
  date_retrait_prevue date,
  emplacement text,                            -- étagère / casier
  observations text,
  forfait_id uuid references public.forfaits (id),
  abonnement_client_id uuid references public.abonnements_clients (id),
  avec_livraison boolean not null default false,
  retire_le timestamptz,
  annule_motif text,
  cree_par uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (boutique_id, numero)
);
create index depots_statut_idx on public.depots (boutique_id, statut);
create index depots_client_idx on public.depots (client_id);
create index depots_retrait_idx on public.depots (boutique_id, date_retrait_prevue) where statut not in ('retire', 'annule');

create table public.depot_lignes (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  depot_id uuid not null references public.depots (id) on delete cascade,
  article_id uuid references public.articles (id),
  service_id uuid references public.services (id),
  libelle text not null,                       -- copie du nom (l'historique reste juste si le catalogue change)
  quantite int not null default 1 check (quantite > 0),
  poids_kg numeric(8,2),                       -- mode kilo
  prix_unitaire int not null default 0,        -- prix à l'article ou prix au kg
  total int not null default 0,                -- calculé
  observations text,
  photo_url text,
  etiquette text,                              -- ex. A-B2-0043-2/5
  statut public.statut_depot not null default 'recu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index depot_lignes_depot_idx on public.depot_lignes (depot_id);
create index depot_lignes_etiquette_idx on public.depot_lignes (pressing_id, etiquette);

create table public.depot_historique (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  depot_id uuid not null references public.depots (id) on delete cascade,
  ancien public.statut_depot,
  nouveau public.statut_depot not null,
  par uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Caisse et paiements
-- ---------------------------------------------------------------------
create table public.sessions_caisse (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  ouvert_par uuid references public.profiles (id) default auth.uid(),
  ouvert_le timestamptz not null default now(),
  fond_initial int not null default 0,
  cloture_par uuid references public.profiles (id),
  cloture_le timestamptz,
  montant_theorique int,
  montant_compte int,
  ecart int,
  commentaire text,
  statut text not null default 'ouverte' check (statut in ('ouverte', 'cloturee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  depot_id uuid references public.depots (id),
  client_id uuid references public.clients (id),
  session_caisse_id uuid references public.sessions_caisse (id),
  montant int not null check (montant > 0),
  moyen public.moyen_paiement not null,
  statut public.statut_paiement not null default 'valide',
  reference_operateur text,                    -- n° de transaction mobile money
  reference_agregateur text,                   -- id côté agrégateur (paiement API)
  encaisse_par uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index paiements_depot_idx on public.paiements (depot_id);
create index paiements_session_idx on public.paiements (session_caisse_id);

-- ---------------------------------------------------------------------
-- 6. Fournisseurs, dépenses, stock
-- ---------------------------------------------------------------------
create table public.fournisseurs (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  telephone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.depenses (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  categorie text not null,                     -- loyer, electricite, eau, carburant, produits, reparation, autre
  libelle text,
  montant int not null check (montant > 0),
  date date not null default current_date,
  moyen public.moyen_paiement not null default 'especes',
  justificatif_url text,
  session_caisse_id uuid references public.sessions_caisse (id),
  fournisseur_id uuid references public.fournisseurs (id),
  par uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.stock_produits (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  nom text not null,
  unite text not null default 'unité',
  quantite numeric(10,2) not null default 0,   -- mise à jour par les mouvements
  seuil_alerte numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  produit_id uuid not null references public.stock_produits (id) on delete cascade,
  type public.type_mouvement not null,
  quantite numeric(10,2) not null check (quantite > 0),
  cout_unitaire int,
  fournisseur_id uuid references public.fournisseurs (id),
  note text,
  par uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Employés et salaires
-- ---------------------------------------------------------------------
create table public.employes (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid references public.boutiques (id),
  user_id uuid references public.profiles (id),   -- si l'employé utilise aussi l'application
  nom text not null,
  telephone text,
  poste text,
  date_embauche date,
  type_remuneration public.type_remuneration not null default 'mensuel',
  montant_base int not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.pointages (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  employe_id uuid not null references public.employes (id) on delete cascade,
  arrivee timestamptz not null default now(),
  depart timestamptz,
  type text not null default 'presence' check (type in ('presence', 'absence', 'conge')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.avances (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  employe_id uuid not null references public.employes (id) on delete cascade,
  montant int not null check (montant > 0),
  date date not null default current_date,
  deduite_salaire_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.salaires (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  employe_id uuid not null references public.employes (id) on delete cascade,
  mois date not null,                          -- premier jour du mois
  base int not null default 0,
  primes int not null default 0,
  retenues int not null default 0,
  avances int not null default 0,
  net int generated always as (base + primes - retenues - avances) stored,
  paye_le date,
  moyen public.moyen_paiement,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employe_id, mois)
);

create table public.mouvements_caisse (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  session_caisse_id uuid not null references public.sessions_caisse (id),
  type public.type_mouvement not null,
  montant int not null check (montant > 0),
  motif text not null,
  depense_id uuid references public.depenses (id),
  salaire_id uuid references public.salaires (id),
  par uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. Livraisons et commandes en ligne
-- ---------------------------------------------------------------------
create table public.zones_livraison (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  nom text not null,
  communes text[] not null default '{}',
  frais int not null default 0,
  seuil_gratuite int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.livraisons (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  depot_id uuid references public.depots (id),
  client_id uuid not null references public.clients (id),
  type public.type_livraison not null,
  adresse text not null,
  repere text,
  zone_id uuid references public.zones_livraison (id),
  creneau_debut timestamptz,
  creneau_fin timestamptz,
  livreur_id uuid references public.profiles (id),
  statut public.statut_livraison not null default 'demande',
  frais int not null default 0,
  code_confirmation text,
  preuve_url text,
  motif_echec text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.commandes_en_ligne (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid not null references public.boutiques (id),
  client_id uuid references public.clients (id),
  articles jsonb not null default '[]'::jsonb,
  adresse text,
  creneau timestamptz,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'confirmee', 'convertie', 'annulee')),
  depot_id uuid references public.depots (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. Messages et audit
-- ---------------------------------------------------------------------
create table public.modeles_messages (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  code text not null,                          -- depot_cree, linge_pret, retard, relance_impaye, paiement_recu...
  canal public.canal_message not null default 'whatsapp',
  contenu text not null,                       -- variables : {client}, {numero}, {montant}, {reste}, {date}, {boutique}
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pressing_id, code, canal)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid not null references public.pressings (id) on delete cascade,
  boutique_id uuid references public.boutiques (id),
  client_id uuid references public.clients (id),
  depot_id uuid references public.depots (id),
  canal public.canal_message not null,
  contenu text not null,
  statut public.statut_message not null default 'en_attente',
  erreur text,
  cout int,
  envoye_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  pressing_id uuid,
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_pressing_idx on public.audit_log (pressing_id, created_at desc);

-- =====================================================================
-- 10. Fonctions utilitaires de sécurité
-- =====================================================================
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.mon_role(p_pressing uuid)
returns public.role_membre language sql stable security definer set search_path = public as $$
  select role from public.memberships
  where pressing_id = p_pressing and user_id = auth.uid() and actif;
$$;

create or replace function public.is_member(p_pressing uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships
                 where pressing_id = p_pressing and user_id = auth.uid() and actif);
$$;

create or replace function public.has_role(p_pressing uuid, p_roles public.role_membre[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships
                 where pressing_id = p_pressing and user_id = auth.uid() and actif
                   and role = any (p_roles));
$$;

-- Accès à une boutique : membre actif ET (propriétaire OU boutique autorisée OU accès à toutes)
create or replace function public.can_access(p_pressing uuid, p_boutique uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m
                 where m.pressing_id = p_pressing and m.user_id = auth.uid() and m.actif
                   and (p_boutique is null or m.role = 'proprietaire'
                        or m.boutique_ids is null or p_boutique = any (m.boutique_ids)));
$$;

-- Personnel du comptoir (le livreur est exclu des opérations générales)
create or replace function public.can_operate(p_pressing uuid, p_boutique uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_access(p_pressing, p_boutique)
     and public.has_role(p_pressing, array['proprietaire', 'gerant', 'caissier']::public.role_membre[]);
$$;

-- =====================================================================
-- 11. Déclencheurs (triggers)
-- =====================================================================

-- updated_at automatique sur toutes les tables qui ont cette colonne
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('create trigger trg_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Profil créé automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nom, telephone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nom', split_part(coalesce(new.email, ''), '@', 1)),
          coalesce(new.phone, new.raw_user_meta_data ->> 'telephone'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Total d'une ligne de dépôt
create or replace function public.calc_ligne_total()
returns trigger language plpgsql as $$
begin
  if new.poids_kg is not null then
    new.total := round(new.prix_unitaire * new.poids_kg);
  else
    new.total := new.prix_unitaire * new.quantite;
  end if;
  return new;
end $$;

create trigger trg_ligne_total before insert or update on public.depot_lignes
  for each row execute function public.calc_ligne_total();

-- Calculs du dépôt : net, reste, statut de paiement
create or replace function public.calc_depot()
returns trigger language plpgsql as $$
begin
  new.net_a_payer := greatest(new.total_ht - new.remise + new.frais_livraison, 0);
  new.reste_a_payer := greatest(new.net_a_payer - new.deja_paye, 0);
  new.statut_paiement := case
    when new.reste_a_payer = 0 then 'solde'
    when new.deja_paye > 0 then 'partiel'
    else 'non_solde' end;
  if new.statut = 'retire' and new.retire_le is null then
    new.retire_le := now();
  end if;
  return new;
end $$;

create trigger trg_calc_depot before insert or update on public.depots
  for each row execute function public.calc_depot();

-- Recalcul du total HT quand les lignes changent
create or replace function public.sync_depot_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare d uuid := coalesce(new.depot_id, old.depot_id);
begin
  update public.depots
     set total_ht = coalesce((select sum(total) from public.depot_lignes
                              where depot_id = d and deleted_at is null), 0)
   where id = d;
  return null;
end $$;

create trigger trg_sync_depot_total after insert or update or delete on public.depot_lignes
  for each row execute function public.sync_depot_total();

-- Recalcul du montant payé quand les paiements changent (seuls les paiements validés comptent)
create or replace function public.sync_depot_paye()
returns trigger language plpgsql security definer set search_path = public as $$
declare d uuid := coalesce(new.depot_id, old.depot_id);
begin
  if d is not null then
    update public.depots
       set deja_paye = coalesce((select sum(montant) from public.paiements
                                 where depot_id = d and statut = 'valide'), 0)
     where id = d;
  end if;
  if tg_op = 'UPDATE' and old.depot_id is distinct from new.depot_id and old.depot_id is not null then
    update public.depots
       set deja_paye = coalesce((select sum(montant) from public.paiements
                                 where depot_id = old.depot_id and statut = 'valide'), 0)
     where id = old.depot_id;
  end if;
  return null;
end $$;

create trigger trg_sync_depot_paye after insert or update or delete on public.paiements
  for each row execute function public.sync_depot_paye();

-- Historique des statuts de dépôt
create or replace function public.log_depot_statut()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut then
    insert into public.depot_historique (pressing_id, depot_id, ancien, nouveau, par)
    values (new.pressing_id, new.id, case when tg_op = 'UPDATE' then old.statut end, new.statut, auth.uid());
  end if;
  return null;
end $$;

create trigger trg_log_depot_statut after insert or update of statut on public.depots
  for each row execute function public.log_depot_statut();

-- Mise à jour du stock par les mouvements
create or replace function public.sync_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.stock_produits
       set quantite = quantite - case when old.type = 'entree' then old.quantite else -old.quantite end
     where id = old.produit_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.stock_produits
       set quantite = quantite + case when new.type = 'entree' then new.quantite else -new.quantite end
     where id = new.produit_id;
  end if;
  return null;
end $$;

create trigger trg_sync_stock after insert or update or delete on public.mouvements_stock
  for each row execute function public.sync_stock();

-- Journal d'audit des actions sensibles
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (pressing_id, user_id, action, table_name, record_id, old_data, new_data)
  values (coalesce(new.pressing_id, old.pressing_id), auth.uid(), tg_op, tg_table_name,
          coalesce(new.id, old.id),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

create trigger trg_audit after update or delete on public.depots
  for each row execute function public.audit_trigger();
create trigger trg_audit after insert or update or delete on public.paiements
  for each row execute function public.audit_trigger();
create trigger trg_audit after update or delete on public.tarifs
  for each row execute function public.audit_trigger();
create trigger trg_audit after insert or update on public.sessions_caisse
  for each row execute function public.audit_trigger();
create trigger trg_audit after insert or update or delete on public.memberships
  for each row execute function public.audit_trigger();
create trigger trg_audit after insert or update or delete on public.mouvements_caisse
  for each row execute function public.audit_trigger();

-- =====================================================================
-- 12. Sécurité par lignes (RLS)
-- =====================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Groupe A — opérations quotidiennes : personnel du comptoir, suppression réservée au propriétaire / gérant
-- Groupe B — configuration : lecture par tous les membres, écriture par propriétaire / gérant
do $$
declare
  t text;
  b text;
  grp_ops text[] := array['clients', 'depots', 'depot_lignes', 'sessions_caisse', 'livraisons',
                          'commandes_en_ligne', 'depenses', 'mouvements_stock', 'messages', 'abonnements_clients'];
  grp_conf text[] := array['categories', 'articles', 'services', 'tarifs', 'prix_kilo', 'forfaits',
                           'formules_abonnement_client', 'zones_livraison', 'fournisseurs',
                           'stock_produits', 'modeles_messages'];
begin
  foreach t in array grp_ops || grp_conf loop
    select case when exists (select 1 from information_schema.columns
                             where table_schema = 'public' and table_name = t and column_name = 'boutique_id')
                then 'boutique_id' else 'null::uuid' end into b;

    if t = any (grp_ops) then
      execute format('create policy %I on public.%I for select to authenticated using (public.can_operate(pressing_id, %s))', t || '_select', t, b);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.can_operate(pressing_id, %s))', t || '_insert', t, b);
      execute format('create policy %I on public.%I for update to authenticated using (public.can_operate(pressing_id, %s)) with check (public.can_operate(pressing_id, %s))', t || '_update', t, b, b);
    else
      execute format('create policy %I on public.%I for select to authenticated using (public.can_access(pressing_id, %s))', t || '_select', t, b);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.can_access(pressing_id, %s) and public.has_role(pressing_id, %L))', t || '_insert', t, b, '{proprietaire,gerant}');
      execute format('create policy %I on public.%I for update to authenticated using (public.can_access(pressing_id, %s) and public.has_role(pressing_id, %L))', t || '_update', t, b, '{proprietaire,gerant}');
    end if;
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_access(pressing_id, %s) and public.has_role(pressing_id, %L))', t || '_delete', t, b, '{proprietaire,gerant}');
  end loop;
end $$;

-- Livreur : voit et met à jour uniquement ses courses
create policy livraisons_livreur_select on public.livraisons for select to authenticated
  using (livreur_id = auth.uid() and public.is_member(pressing_id));
create policy livraisons_livreur_update on public.livraisons for update to authenticated
  using (livreur_id = auth.uid() and public.is_member(pressing_id))
  with check (livreur_id = auth.uid());
-- Le livreur doit voir le client et le dépôt de ses courses
create policy clients_livreur_select on public.clients for select to authenticated
  using (exists (select 1 from public.livraisons l where l.client_id = clients.id and l.livreur_id = auth.uid()));
create policy depots_livreur_select on public.depots for select to authenticated
  using (exists (select 1 from public.livraisons l where l.depot_id = depots.id and l.livreur_id = auth.uid()));

-- Profils
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin() or exists (
    select 1 from public.memberships a join public.memberships b on a.pressing_id = b.pressing_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and is_super_admin = (select p.is_super_admin from public.profiles p where p.id = auth.uid()));

-- Pressings (création uniquement via la fonction creer_pressing)
create policy pressings_select on public.pressings for select to authenticated
  using (public.is_member(id) or public.is_super_admin());
create policy pressings_update on public.pressings for update to authenticated
  using (public.has_role(id, '{proprietaire}') or public.is_super_admin());

-- Boutiques
create policy boutiques_select on public.boutiques for select to authenticated
  using (public.can_access(pressing_id, id) or public.is_super_admin());
create policy boutiques_write on public.boutiques for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire}'))
  with check (public.has_role(pressing_id, '{proprietaire}'));

-- Membres
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.has_role(pressing_id, '{proprietaire,gerant}'));
create policy memberships_write on public.memberships for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire}'))
  with check (public.has_role(pressing_id, '{proprietaire}'));

-- Paiements et mouvements de caisse : ajout uniquement, jamais supprimés.
-- Seuls propriétaire / gérant peuvent modifier (ex. valider un paiement « à vérifier », annuler).
create policy paiements_select on public.paiements for select to authenticated
  using (public.can_operate(pressing_id, boutique_id));
create policy paiements_insert on public.paiements for insert to authenticated
  with check (public.can_operate(pressing_id, boutique_id));
create policy paiements_update on public.paiements for update to authenticated
  using (public.can_access(pressing_id, boutique_id) and public.has_role(pressing_id, '{proprietaire,gerant}'));

create policy mouvements_caisse_select on public.mouvements_caisse for select to authenticated
  using (public.can_operate(pressing_id, boutique_id));
create policy mouvements_caisse_insert on public.mouvements_caisse for insert to authenticated
  with check (public.can_operate(pressing_id, boutique_id));
create policy mouvements_caisse_update on public.mouvements_caisse for update to authenticated
  using (public.can_access(pressing_id, boutique_id) and public.has_role(pressing_id, '{proprietaire,gerant}'));

-- Historique et audit : lecture seule (écrits par les triggers)
create policy depot_historique_select on public.depot_historique for select to authenticated
  using (public.can_operate(pressing_id, null));
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_role(pressing_id, '{proprietaire}') or public.is_super_admin());

-- Employés et pointages : propriétaire et gérant
create policy employes_all on public.employes for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire,gerant}'))
  with check (public.has_role(pressing_id, '{proprietaire,gerant}'));
create policy pointages_all on public.pointages for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire,gerant}'))
  with check (public.has_role(pressing_id, '{proprietaire,gerant}'));
-- Avances et salaires : propriétaire uniquement
create policy avances_all on public.avances for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire}'))
  with check (public.has_role(pressing_id, '{proprietaire}'));
create policy salaires_all on public.salaires for all to authenticated
  using (public.has_role(pressing_id, '{proprietaire}'))
  with check (public.has_role(pressing_id, '{proprietaire}'));

-- =====================================================================
-- 13. Vues
-- =====================================================================
create view public.v_clients_soldes with (security_invoker = true) as
select c.id, c.pressing_id, c.nom, c.telephone,
       count(d.id) filter (where d.statut <> 'annule') as nb_depots,
       coalesce(sum(d.net_a_payer) filter (where d.statut <> 'annule'), 0) as total_depense,
       coalesce(sum(d.reste_a_payer) filter (where d.statut <> 'annule'), 0) as solde_du,
       max(d.created_at) as derniere_visite
from public.clients c
left join public.depots d on d.client_id = c.id and d.deleted_at is null
where c.deleted_at is null
group by c.id;

create view public.v_depots_en_retard with (security_invoker = true) as
select d.*, c.nom as client_nom, c.telephone as client_telephone,
       current_date - d.date_retrait_prevue as jours_retard
from public.depots d
join public.clients c on c.id = d.client_id
where d.deleted_at is null
  and d.statut in ('recu', 'en_traitement', 'pret')
  and d.date_retrait_prevue < current_date;

-- =====================================================================
-- 14. Création d'un pressing (inscription) + catalogue par défaut
-- =====================================================================
create or replace function public.creer_pressing(
  p_nom text, p_telephone text, p_boutique_nom text default 'Boutique principale', p_commune text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_pressing uuid;
  v_boutique uuid;
  v_cat_vet uuid; v_cat_trad uuid; v_cat_maison uuid; v_cat_spec uuid;
  v_srv_complet uuid; v_srv_sec uuid; v_srv_lavage uuid; v_srv_repassage uuid; v_srv_detachage uuid;
begin
  if v_user is null then
    raise exception 'Vous devez être connecté pour créer un pressing';
  end if;

  insert into public.pressings (nom, telephone, created_by) values (p_nom, p_telephone, v_user)
  returning id into v_pressing;

  insert into public.boutiques (pressing_id, nom, commune, telephone, prefixe)
  values (v_pressing, p_boutique_nom, p_commune, p_telephone, 'A')
  returning id into v_boutique;

  insert into public.memberships (pressing_id, user_id, role, plafond_remise_pct)
  values (v_pressing, v_user, 'proprietaire', 100);

  -- Services
  insert into public.services (pressing_id, nom, delai_jours, ordre) values (v_pressing, 'Nettoyage complet', 2, 1) returning id into v_srv_complet;
  insert into public.services (pressing_id, nom, delai_jours, ordre) values (v_pressing, 'Nettoyage à sec', 3, 2) returning id into v_srv_sec;
  insert into public.services (pressing_id, nom, delai_jours, ordre) values (v_pressing, 'Lavage seul', 1, 3) returning id into v_srv_lavage;
  insert into public.services (pressing_id, nom, delai_jours, ordre) values (v_pressing, 'Repassage seul', 1, 4) returning id into v_srv_repassage;
  insert into public.services (pressing_id, nom, delai_jours, ordre) values (v_pressing, 'Détachage spécial', 3, 5) returning id into v_srv_detachage;

  -- Catégories
  insert into public.categories (pressing_id, nom, code, ordre) values (v_pressing, 'Vêtements', 'VT', 1) returning id into v_cat_vet;
  insert into public.categories (pressing_id, nom, code, ordre) values (v_pressing, 'Tenues traditionnelles', 'TT', 2) returning id into v_cat_trad;
  insert into public.categories (pressing_id, nom, code, ordre) values (v_pressing, 'Linge de maison', 'LM', 3) returning id into v_cat_maison;
  insert into public.categories (pressing_id, nom, code, ordre) values (v_pressing, 'Articles spéciaux', 'AS', 4) returning id into v_cat_spec;

  -- Articles + tarifs indicatifs (Nettoyage complet / Repassage seul), modifiables par le pressing
  with a(cat, nom, ordre, prix_complet, prix_repassage) as (
    values (v_cat_vet, 'Chemise', 1, 1000, 300), (v_cat_vet, 'Pantalon', 2, 1200, 300),
           (v_cat_vet, 'Polo / T-shirt', 3, 800, 200), (v_cat_vet, 'Jean', 4, 1000, 300),
           (v_cat_vet, 'Robe', 5, 1500, 500), (v_cat_vet, 'Veste', 6, 2000, 700),
           (v_cat_vet, 'Costume 2 pièces', 7, 4000, 1200),
           (v_cat_trad, 'Boubou simple', 1, 2000, 700), (v_cat_trad, 'Grand boubou', 2, 3500, 1000),
           (v_cat_trad, 'Complet pagne', 3, 2000, 600),
           (v_cat_maison, 'Drap', 1, 1500, 500), (v_cat_maison, 'Couette 1 place', 2, 3500, null),
           (v_cat_maison, 'Couette 2 places', 3, 5000, null), (v_cat_maison, 'Rideau (panneau)', 4, 2000, 700),
           (v_cat_spec, 'Robe de mariée', 1, 15000, null), (v_cat_spec, 'Tapis (m²)', 2, 2500, null),
           (v_cat_spec, 'Vêtement en cuir', 3, 6000, null)
  ), ins as (
    insert into public.articles (pressing_id, categorie_id, nom, ordre)
    select v_pressing, cat, nom, ordre from a
    returning id, nom
  )
  insert into public.tarifs (pressing_id, article_id, service_id, prix)
  select v_pressing, ins.id, s.service_id, s.prix
  from ins join a on a.nom = ins.nom
  cross join lateral (values (v_srv_complet, a.prix_complet), (v_srv_repassage, a.prix_repassage)) as s(service_id, prix)
  where s.prix is not null;

  -- Prix au kilo indicatifs
  insert into public.prix_kilo (pressing_id, service_id, prix_kg, poids_min) values
    (v_pressing, v_srv_lavage, 1000, 3), (v_pressing, v_srv_complet, 1500, 3);

  -- Modèles de messages
  insert into public.modeles_messages (pressing_id, code, canal, contenu) values
    (v_pressing, 'depot_cree', 'whatsapp', 'Bonjour {client}, votre dépôt n° {numero} est bien enregistré chez {boutique}. Montant : {montant} FCFA, reste à payer : {reste} FCFA. Retrait prévu le {date}.'),
    (v_pressing, 'linge_pret', 'whatsapp', 'Bonjour {client}, votre linge (dépôt n° {numero}) est prêt ! Reste à payer : {reste} FCFA. À bientôt chez {boutique}.'),
    (v_pressing, 'retard', 'whatsapp', 'Bonjour {client}, votre linge (dépôt n° {numero}) vous attend depuis le {date} chez {boutique}.'),
    (v_pressing, 'relance_impaye', 'whatsapp', 'Bonjour {client}, il reste {reste} FCFA à régler sur votre dépôt n° {numero}. Merci !'),
    (v_pressing, 'paiement_recu', 'whatsapp', 'Merci {client}, nous avons reçu votre paiement de {montant} FCFA pour le dépôt n° {numero}.');

  return v_pressing;
end $$;

revoke all on function public.creer_pressing(text, text, text, text) from public;
grant execute on function public.creer_pressing(text, text, text, text) to authenticated;
