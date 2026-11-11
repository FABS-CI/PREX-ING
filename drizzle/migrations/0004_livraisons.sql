-- =====================================================================
-- PREX'ING — Migration 7 : tournées du livreur (démarrer, échec, livraison confirmée)
-- À appliquer après la migration 6. Idempotente.
-- Le livreur n'a pas les droits du comptoir : ces fonctions vérifient qu'il s'agit
-- bien de SA course, et font pour lui le changement de statut et l'encaissement.
-- =====================================================================

create or replace function public.peut_gerer_livraison(l public.livraisons)
returns boolean language sql stable security definer set search_path = public as $$
  select (l.livreur_id = auth.uid() and public.is_member(l.pressing_id))
      or public.can_operate(l.pressing_id, l.boutique_id);
$$;

-- Démarrer la course, signaler un échec (motif obligatoire) ou annuler (comptoir seulement).
create or replace function public.avancer_livraison(p_livraison uuid, p_statut public.statut_livraison, p_motif text default null)
returns public.livraisons language plpgsql security definer set search_path = public as $$
declare
  l public.livraisons;
begin
  select * into l from public.livraisons where id = p_livraison and deleted_at is null for update;
  if l.id is null or not public.peut_gerer_livraison(l) then
    raise exception 'Course introuvable.' using errcode = 'P0002';
  end if;
  if l.statut in ('effectue', 'annule') then
    raise exception 'Cette course est terminée.' using errcode = '22023';
  end if;
  if p_statut = 'en_cours' then
    if l.livreur_id is null then
      raise exception 'Affectez d''abord un livreur.' using errcode = '22023';
    end if;
    update public.livraisons set statut = 'en_cours', motif_echec = null where id = l.id returning * into l;
    if l.type = 'livraison' and l.depot_id is not null then
      update public.depots set statut = 'en_livraison' where id = l.depot_id and statut in ('pret', 'en_livraison');
    end if;
  elsif p_statut = 'echoue' then
    if coalesce(trim(p_motif), '') = '' then
      raise exception 'Indiquez le motif de l''échec.' using errcode = '22023';
    end if;
    update public.livraisons set statut = 'echoue', motif_echec = trim(p_motif) where id = l.id returning * into l;
    if l.type = 'livraison' and l.depot_id is not null then
      update public.depots set statut = 'pret' where id = l.depot_id and statut = 'en_livraison';
    end if;
  elsif p_statut = 'annule' then
    if not public.can_operate(l.pressing_id, l.boutique_id) then
      raise exception 'Seul le comptoir peut annuler une course.' using errcode = '42501';
    end if;
    update public.livraisons set statut = 'annule', motif_echec = nullif(trim(p_motif), '') where id = l.id returning * into l;
    if l.type = 'livraison' and l.depot_id is not null then
      update public.depots set statut = 'pret', frais_livraison = 0 where id = l.depot_id and statut in ('pret', 'en_livraison');
    end if;
  else
    raise exception 'Changement de statut non permis.' using errcode = '22023';
  end if;
  return l;
end $$;

-- Livraison ou ramassage effectué : code du client vérifié, solde encaissé, dépôt remis.
create or replace function public.terminer_livraison(
  p_livraison uuid, p_code text default null, p_montant int default 0,
  p_moyen public.moyen_paiement default 'especes', p_reference text default null)
returns public.livraisons language plpgsql security definer set search_path = public as $$
declare
  l public.livraisons;
  d public.depots;
begin
  select * into l from public.livraisons where id = p_livraison and deleted_at is null for update;
  if l.id is null or not public.peut_gerer_livraison(l) then
    raise exception 'Course introuvable.' using errcode = 'P0002';
  end if;
  if l.statut in ('effectue', 'annule') then
    raise exception 'Cette course est terminée.' using errcode = '22023';
  end if;
  if l.code_confirmation is not null and coalesce(trim(p_code), '') <> l.code_confirmation
     and not public.can_operate(l.pressing_id, l.boutique_id) then
    raise exception 'Code de confirmation incorrect.' using errcode = '22023';
  end if;
  if l.depot_id is not null then
    select * into d from public.depots where id = l.depot_id for update;
  end if;
  if coalesce(p_montant, 0) > 0 then
    if d.id is null or p_montant > d.reste_a_payer then
      raise exception 'Le montant dépasse le reste à payer.' using errcode = '22023';
    end if;
    if p_moyen <> 'especes' and coalesce(trim(p_reference), '') = '' then
      raise exception 'Saisissez la référence de la transaction.' using errcode = '22023';
    end if;
    insert into public.paiements (pressing_id, boutique_id, depot_id, client_id, montant, moyen, statut, reference_operateur, encaisse_par)
    values (l.pressing_id, l.boutique_id, d.id, d.client_id, p_montant, p_moyen,
            case when p_moyen = 'especes' then 'valide' else 'a_verifier' end::public.statut_paiement,
            nullif(trim(p_reference), ''), auth.uid());
    select * into d from public.depots where id = l.depot_id;
  end if;
  if l.type = 'livraison' and d.id is not null then
    if d.reste_a_payer > 0 and not public.can_operate(l.pressing_id, l.boutique_id) and p_moyen = 'especes' then
      raise exception 'Encaissez le solde (% FCFA) avant de remettre le linge.', d.reste_a_payer using errcode = '22023';
    end if;
    update public.depot_lignes set statut = 'retire' where depot_id = d.id and deleted_at is null;
    update public.depots set statut = 'retire' where id = d.id;
  end if;
  update public.livraisons set statut = 'effectue', motif_echec = null where id = l.id returning * into l;
  return l;
end $$;

grant execute on function public.peut_gerer_livraison(public.livraisons) to authenticated;
grant execute on function public.avancer_livraison(uuid, public.statut_livraison, text) to authenticated;
grant execute on function public.terminer_livraison(uuid, text, int, public.moyen_paiement, text) to authenticated;
