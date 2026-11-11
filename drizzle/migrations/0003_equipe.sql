-- =====================================================================
-- PREX'ING — Migration 6 : équipe, pointage et paiement des salaires
-- À appliquer après la migration 5. Idempotente.
-- =====================================================================

-- 1. Ajouter un membre : l'employé crée d'abord son compte, le propriétaire l'ajoute par son email.
create or replace function public.ajouter_membre(
  p_pressing uuid, p_email text, p_role public.role_membre,
  p_plafond numeric default 0, p_boutique_ids uuid[] default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if not public.has_role(p_pressing, array['proprietaire']::public.role_membre[]) then
    raise exception 'Seul le propriétaire peut ajouter un membre.' using errcode = '42501';
  end if;
  if p_role = 'proprietaire' then
    raise exception 'Le rôle propriétaire ne peut pas être attribué ici.' using errcode = '22023';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    raise exception 'Aucun compte PREX''ING avec cet email. L''employé doit d''abord créer son compte (page Inscription).'
      using errcode = 'P0002';
  end if;
  if v_user = auth.uid() then
    raise exception 'Vous êtes déjà propriétaire de ce pressing.' using errcode = '22023';
  end if;
  insert into public.memberships (pressing_id, user_id, role, plafond_remise_pct, boutique_ids, actif)
  values (p_pressing, v_user, p_role, coalesce(p_plafond, 0), p_boutique_ids, true)
  on conflict (pressing_id, user_id) do update
    set role = excluded.role, plafond_remise_pct = excluded.plafond_remise_pct,
        boutique_ids = excluded.boutique_ids, actif = true
  returning id into v_id;
  -- Fiche employé liée (créée une seule fois).
  if not exists (select 1 from public.employes where pressing_id = p_pressing and user_id = v_user and deleted_at is null) then
    insert into public.employes (pressing_id, user_id, nom, telephone, poste, date_embauche)
    select p_pressing, v_user, coalesce(nullif(p.nom, ''), 'Employé'), p.telephone,
           case p_role when 'gerant' then 'Gérant' when 'livreur' then 'Livreur' else 'Caissier' end, current_date
      from public.profiles p where p.id = v_user;
  end if;
  return v_id;
end $$;

-- Un membre ne peut pas se retirer ou changer son propre rôle ; le propriétaire reste propriétaire.
create or replace function public.proteger_membership()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.role = 'proprietaire' and (new.role <> 'proprietaire' or not new.actif) then
    raise exception 'Le propriétaire ne peut pas être retiré ni changer de rôle.' using errcode = '42501';
  end if;
  if new.role = 'proprietaire' and old.role <> 'proprietaire' then
    raise exception 'Le rôle propriétaire ne peut pas être attribué ici.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_membership on public.memberships;
create trigger trg_proteger_membership before update on public.memberships
  for each row execute function public.proteger_membership();

-- 2. Pointage par l'employé lui-même (arrivée, puis départ).
create or replace function public.etat_pointage(p_pressing uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when e.id is null then null else jsonb_build_object(
    'employe_id', e.id,
    'nom', e.nom,
    'arrivee', (select p.arrivee from public.pointages p
                 where p.employe_id = e.id and p.type = 'presence' and p.depart is null
                    and p.arrivee >= date_trunc('day', now())
                 order by p.arrivee desc limit 1)) end
  from (select 1) x
  left join public.employes e
    on e.pressing_id = p_pressing and e.user_id = auth.uid() and e.actif and e.deleted_at is null;
$$;

create or replace function public.pointer(p_pressing uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_employe uuid;
  v_ouvert uuid;
begin
  select id into v_employe from public.employes
   where pressing_id = p_pressing and user_id = auth.uid() and actif and deleted_at is null limit 1;
  if v_employe is null then
    raise exception 'Aucune fiche employé n''est liée à votre compte.' using errcode = 'P0002';
  end if;
  select id into v_ouvert from public.pointages
   where employe_id = v_employe and type = 'presence' and depart is null
      and arrivee >= date_trunc('day', now())
   order by arrivee desc limit 1;
  if v_ouvert is null then
    insert into public.pointages (pressing_id, employe_id, arrivee, type) values (p_pressing, v_employe, now(), 'presence');
  else
    update public.pointages set depart = now() where id = v_ouvert;
  end if;
  return public.etat_pointage(p_pressing);
end $$;

-- 3. Paiement d'un salaire : marque les avances déduites ; en espèces, sortie de la caisse ouverte.
create or replace function public.payer_salaire(p_salaire uuid, p_moyen public.moyen_paiement)
returns public.salaires language plpgsql security invoker set search_path = public as $$
declare
  s public.salaires;
  e public.employes;
  v_session uuid;
begin
  select * into s from public.salaires where id = p_salaire for update;
  if s.id is null then
    raise exception 'Salaire introuvable.' using errcode = 'P0002';
  end if;
  if not public.has_role(s.pressing_id, array['proprietaire']::public.role_membre[]) then
    raise exception 'Seul le propriétaire peut payer les salaires.' using errcode = '42501';
  end if;
  if s.paye_le is not null then
    raise exception 'Ce salaire est déjà payé.' using errcode = '22023';
  end if;
  update public.salaires set paye_le = current_date, moyen = p_moyen where id = s.id returning * into s;
  update public.avances set deduite_salaire_id = s.id
   where employe_id = s.employe_id and deduite_salaire_id is null
     and date < (s.mois + interval '1 month');
  select * into e from public.employes where id = s.employe_id;
  if p_moyen = 'especes' and s.net > 0 then
    select id into v_session from public.sessions_caisse
     where pressing_id = s.pressing_id and statut = 'ouverte'
       and (e.boutique_id is null or boutique_id = e.boutique_id)
     order by ouvert_le limit 1;
    if v_session is not null then
      insert into public.mouvements_caisse (pressing_id, boutique_id, session_caisse_id, type, montant, motif, salaire_id)
      select s.pressing_id, sc.boutique_id, sc.id, 'sortie', s.net,
             'Salaire ' || to_char(s.mois, 'MM/YYYY') || ' : ' || e.nom, s.id
        from public.sessions_caisse sc where sc.id = v_session;
    end if;
  end if;
  return s;
end $$;

grant execute on function public.ajouter_membre(uuid, text, public.role_membre, numeric, uuid[]) to authenticated;
grant execute on function public.etat_pointage(uuid) to authenticated;
grant execute on function public.pointer(uuid) to authenticated;
grant execute on function public.payer_salaire(uuid, public.moyen_paiement) to authenticated;
