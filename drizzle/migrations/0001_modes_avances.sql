-- =====================================================================
-- PREX'ING — Migration 4 : modes Kilo, Forfait et Abonnement client
-- À appliquer après la migration 3. Idempotente.
-- =====================================================================

-- 1. Ligne « lot » à prix fixe (forfait) : le total de la ligne est le prix du lot,
--    la quantité reste le nombre de pièces (pour les étiquettes et le contrôle au retrait).
alter table public.depot_lignes add column if not exists prix_lot int check (prix_lot >= 0);
alter table public.depot_lignes add column if not exists forfait_id uuid references public.forfaits (id);
alter table public.depot_lignes add column if not exists couvert_abonnement boolean not null default false;

create or replace function public.calc_ligne_total()
returns trigger language plpgsql as $$
begin
  if new.couvert_abonnement then
    new.total := 0;
  elsif new.prix_lot is not null then
    new.total := new.prix_lot;
  elsif new.poids_kg is not null then
    new.total := round(new.prix_unitaire * new.poids_kg);
  else
    new.total := new.prix_unitaire * new.quantite;
  end if;
  return new;
end $$;

-- 2. Abonnements : expiration automatique à la lecture du statut
create or replace function public.abonnement_statut_auto()
returns trigger language plpgsql as $$
begin
  if new.statut = 'actif' and new.fin < current_date then
    new.statut := 'expire';
  elsif new.statut = 'actif' and new.quota_pieces is not null and new.consomme_pieces >= new.quota_pieces then
    new.statut := 'epuise';
  elsif new.statut = 'epuise' and new.quota_pieces is not null and new.consomme_pieces < new.quota_pieces
        and new.fin >= current_date then
    new.statut := 'actif';
  end if;
  return new;
end $$;

drop trigger if exists trg_abonnement_statut_auto on public.abonnements_clients;
create trigger trg_abonnement_statut_auto before insert or update on public.abonnements_clients
  for each row execute function public.abonnement_statut_auto();

-- 3. Consommation du quota en pièces, verrouillée (deux comptoirs en même temps).
--    p_pieces > 0 : consomme et renvoie le nombre de pièces couvertes.
--    p_pieces < 0 : restitue (annulation d'un dépôt qui n'a pas pu être créé).
create or replace function public.consommer_abonnement(p_abonnement uuid, p_pieces int)
returns int language plpgsql security invoker set search_path = public as $$
declare
  a public.abonnements_clients;
  v_couvert int;
begin
  select * into a from public.abonnements_clients
   where id = p_abonnement and deleted_at is null
   for update;
  if a.id is null then
    raise exception 'Abonnement introuvable.' using errcode = 'P0002';
  end if;
  if p_pieces < 0 then
    update public.abonnements_clients
       set consomme_pieces = greatest(consomme_pieces + p_pieces, 0)
     where id = a.id;
    return p_pieces;
  end if;
  if a.statut <> 'actif' or a.fin < current_date then
    raise exception 'Cet abonnement n''est plus actif.' using errcode = '22023';
  end if;
  if a.quota_pieces is null then
    raise exception 'Cet abonnement n''a pas de quota en pièces.' using errcode = '22023';
  end if;
  v_couvert := least(greatest(p_pieces, 0), greatest(a.quota_pieces - a.consomme_pieces, 0));
  update public.abonnements_clients
     set consomme_pieces = consomme_pieces + v_couvert
   where id = a.id;
  return v_couvert;
end $$;

grant execute on function public.consommer_abonnement(uuid, int) to authenticated;
