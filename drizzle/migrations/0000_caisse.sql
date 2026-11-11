-- =====================================================================
-- PREX'ING — Migration 3 : règles de caisse et sécurité des annulations
-- À appliquer après 20261111000001_init.sql et 20261111000002_storage.sql.
-- Idempotente : peut être rejouée sans erreur.
-- =====================================================================

-- 1. Une seule session de caisse ouverte par boutique
create unique index if not exists sessions_caisse_une_ouverte
  on public.sessions_caisse (boutique_id) where statut = 'ouverte';

-- 2. Un paiement sans session est rattaché à la session ouverte de sa boutique
create or replace function public.paiement_session_auto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.session_caisse_id is null then
    select id into new.session_caisse_id
      from public.sessions_caisse
     where boutique_id = new.boutique_id and statut = 'ouverte'
     limit 1;
  end if;
  return new;
end $$;

drop trigger if exists trg_paiement_session_auto on public.paiements;
create trigger trg_paiement_session_auto before insert on public.paiements
  for each row execute function public.paiement_session_auto();

-- 3. Montant théorique d'une session : fond + espèces validées + entrées − sorties
create or replace function public.caisse_theorique(p_session uuid)
returns int language sql stable security invoker set search_path = public as $$
  select s.fond_initial
       + coalesce((select sum(p.montant) from public.paiements p
                    where p.session_caisse_id = s.id and p.moyen = 'especes' and p.statut = 'valide'), 0)
       + coalesce((select sum(case when m.type = 'entree' then m.montant else -m.montant end)
                     from public.mouvements_caisse m where m.session_caisse_id = s.id), 0)
  from public.sessions_caisse s
  where s.id = p_session;
$$;

-- 4. Clôture : calcule le théorique côté serveur, écart justifié obligatoire
create or replace function public.cloturer_caisse(p_session uuid, p_montant_compte int, p_commentaire text default null)
returns public.sessions_caisse language plpgsql security invoker set search_path = public as $$
declare
  v_theorique int;
  v_session public.sessions_caisse;
begin
  if p_montant_compte is null or p_montant_compte < 0 then
    raise exception 'Montant compté invalide.' using errcode = '22023';
  end if;
  v_theorique := public.caisse_theorique(p_session);
  if v_theorique is null then
    raise exception 'Session de caisse introuvable.' using errcode = 'P0002';
  end if;
  if p_montant_compte <> v_theorique and coalesce(trim(p_commentaire), '') = '' then
    raise exception 'Un écart de caisse doit être justifié.' using errcode = '22023';
  end if;
  update public.sessions_caisse
     set statut = 'cloturee',
         cloture_par = auth.uid(),
         cloture_le = now(),
         montant_theorique = v_theorique,
         montant_compte = p_montant_compte,
         ecart = p_montant_compte - v_theorique,
         commentaire = nullif(trim(p_commentaire), '')
   where id = p_session and statut = 'ouverte'
   returning * into v_session;
  if v_session.id is null then
    raise exception 'Cette caisse est déjà clôturée.' using errcode = '22023';
  end if;
  return v_session;
end $$;

-- 5. Clôture réservée au propriétaire et au gérant ; une session clôturée ne change plus
create or replace function public.proteger_session_caisse()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.statut = 'cloturee' then
    raise exception 'Une caisse clôturée ne peut plus être modifiée.' using errcode = '42501';
  end if;
  if new.statut = 'cloturee'
     and not public.has_role(new.pressing_id, array['proprietaire', 'gerant']::public.role_membre[]) then
    raise exception 'Seuls le propriétaire et le gérant peuvent clôturer la caisse.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_session_caisse on public.sessions_caisse;
create trigger trg_proteger_session_caisse before update on public.sessions_caisse
  for each row execute function public.proteger_session_caisse();

-- 6. Annulation d'un dépôt : propriétaire ou gérant, motif obligatoire
create or replace function public.proteger_annulation_depot()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.statut = 'annule' and old.statut is distinct from 'annule' then
    if not public.has_role(new.pressing_id, array['proprietaire', 'gerant']::public.role_membre[]) then
      raise exception 'Seuls le propriétaire et le gérant peuvent annuler un dépôt.' using errcode = '42501';
    end if;
    if coalesce(trim(new.annule_motif), '') = '' then
      raise exception 'Le motif d''annulation est obligatoire.' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_annulation_depot on public.depots;
create trigger trg_proteger_annulation_depot before update of statut on public.depots
  for each row execute function public.proteger_annulation_depot();

grant execute on function public.caisse_theorique(uuid) to authenticated;
grant execute on function public.cloturer_caisse(uuid, int, text) to authenticated;
