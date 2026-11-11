-- =====================================================================
-- PREX'ING — Migration 5 : une dépense payée en espèces sort de la caisse ouverte
-- À appliquer après la migration 4. Idempotente.
-- =====================================================================

-- Avant l'insertion : rattache la dépense en espèces à la session de caisse ouverte.
create or replace function public.depense_session_auto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moyen = 'especes' and new.session_caisse_id is null then
    select id into new.session_caisse_id
      from public.sessions_caisse
     where boutique_id = new.boutique_id and statut = 'ouverte'
     limit 1;
  end if;
  return new;
end $$;

drop trigger if exists trg_depense_session_auto on public.depenses;
create trigger trg_depense_session_auto before insert on public.depenses
  for each row execute function public.depense_session_auto();

-- Après l'insertion : crée la sortie de caisse correspondante (une seule fois).
create or replace function public.depense_sortie_caisse()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moyen = 'especes' and new.session_caisse_id is not null
     and not exists (select 1 from public.mouvements_caisse where depense_id = new.id) then
    insert into public.mouvements_caisse
      (pressing_id, boutique_id, session_caisse_id, type, montant, motif, depense_id, par)
    values
      (new.pressing_id, new.boutique_id, new.session_caisse_id, 'sortie', new.montant,
       'Dépense : ' || coalesce(nullif(trim(new.libelle), ''), new.categorie), new.id, new.par);
  end if;
  return new;
end $$;

drop trigger if exists trg_depense_sortie_caisse on public.depenses;
create trigger trg_depense_sortie_caisse after insert on public.depenses
  for each row execute function public.depense_sortie_caisse();
