-- =====================================================================
-- PREX'ING — Migration 8 : portail client (page publique, suivi de dépôt, ramassage en ligne)
-- À appliquer après la migration 7. Idempotente.
-- Les visiteurs non connectés (rôle anon) n'accèdent à AUCUNE table : seulement à ces
-- 3 fonctions, qui ne renvoient que des informations publiques ou liées à un lien secret.
-- =====================================================================

-- 1. Adresse publique du pressing : prexing.ci/p/<slug>
alter table public.pressings add column if not exists slug text;

create or replace function public.slug_de(p_texte text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_texte, '')), 'àâäáãçéèêëíìîïñóòôöõúùûüýÿœæ’''', 'aaaaaceeeeiiiinooooouuuuyyoe--'),
    '[^a-z0-9]+', '-', 'g'));
$$;

update public.pressings
   set slug = public.slug_de(nom) || '-' || substr(replace(id::text, '-', ''), 1, 4)
 where slug is null;

create unique index if not exists pressings_slug_unique on public.pressings (slug);

create or replace function public.pressing_slug_auto()
returns trigger language plpgsql as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.slug_de(new.nom) || '-' || substr(replace(new.id::text, '-', ''), 1, 4);
  else
    new.slug := public.slug_de(new.slug);
  end if;
  if length(new.slug) < 3 then
    raise exception 'L''adresse de la page doit faire au moins 3 caractères.' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists trg_pressing_slug_auto on public.pressings;
create trigger trg_pressing_slug_auto before insert or update of slug, nom on public.pressings
  for each row when (new.slug is null or new.slug is distinct from public.slug_de(new.slug) or new.slug = '')
  execute function public.pressing_slug_auto();

-- 2. Lien de suivi secret de chaque dépôt (imprimé en QR code sur le ticket)
alter table public.depots add column if not exists jeton_suivi text not null
  default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists depots_jeton_suivi_unique on public.depots (jeton_suivi);

-- 3. Page publique du pressing
create or replace function public.page_pressing(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'nom', p.nom, 'telephone', p.telephone, 'logo_url', p.logo_url, 'slug', p.slug,
    'boutiques', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nom', b.nom, 'adresse', b.adresse,
                    'commune', b.commune, 'telephone', b.telephone) order by b.created_at)
                  from public.boutiques b where b.pressing_id = p.id and b.actif and b.deleted_at is null), '[]'),
    'tarifs', coalesce((select jsonb_agg(jsonb_build_object('categorie', c.nom, 'article', a.nom, 'service', s.nom, 'prix', t.prix)
                    order by c.ordre, a.ordre, a.nom, s.ordre)
                  from public.tarifs t
                  join public.articles a on a.id = t.article_id and a.actif and a.deleted_at is null
                  join public.services s on s.id = t.service_id and s.actif and s.deleted_at is null
                  left join public.categories c on c.id = a.categorie_id
                 where t.pressing_id = p.id and t.boutique_id is null and t.deleted_at is null), '[]'),
    'services', coalesce((select jsonb_agg(jsonb_build_object('nom', s.nom, 'delai_jours', s.delai_jours) order by s.ordre)
                  from public.services s where s.pressing_id = p.id and s.actif and s.deleted_at is null), '[]'),
    'kilo', coalesce((select jsonb_agg(jsonb_build_object('service', s.nom, 'prix_kg', k.prix_kg, 'poids_min', k.poids_min))
                  from public.prix_kilo k join public.services s on s.id = k.service_id
                 where k.pressing_id = p.id and k.boutique_id is null and k.deleted_at is null), '[]'),
    'zones', coalesce((select jsonb_agg(jsonb_build_object('nom', z.nom, 'communes', z.communes, 'frais', z.frais,
                    'seuil_gratuite', z.seuil_gratuite) order by z.frais)
                  from public.zones_livraison z where z.pressing_id = p.id and z.deleted_at is null), '[]'))
  from public.pressings p
  where p.slug = lower(trim(p_slug)) and p.deleted_at is null and p.statut_abonnement <> 'suspendu';
$$;

-- 4. Suivi d'un dépôt par son lien secret (aucune donnée personnelle hormis le prénom)
create or replace function public.suivi_depot(p_jeton text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'numero', d.numero, 'statut', d.statut, 'statut_paiement', d.statut_paiement, 'express', d.express,
    'depose_le', d.created_at, 'retrait_prevu', d.date_retrait_prevue, 'retire_le', d.retire_le,
    'net_a_payer', d.net_a_payer, 'deja_paye', d.deja_paye, 'reste_a_payer', d.reste_a_payer,
    'client', split_part(c.nom, ' ', 1),
    'pressing', jsonb_build_object('nom', p.nom, 'slug', p.slug),
    'boutique', jsonb_build_object('nom', b.nom, 'adresse', b.adresse, 'commune', b.commune,
                                   'telephone', coalesce(b.telephone, p.telephone)),
    'lignes', coalesce((select jsonb_agg(jsonb_build_object('libelle', l.libelle, 'quantite', l.quantite) order by l.created_at)
                 from public.depot_lignes l where l.depot_id = d.id and l.deleted_at is null), '[]'),
    'livraison', (select jsonb_build_object('type', v.type, 'statut', v.statut, 'creneau_debut', v.creneau_debut, 'creneau_fin', v.creneau_fin)
                    from public.livraisons v where v.depot_id = d.id and v.deleted_at is null and v.statut <> 'annule'
                   order by v.created_at desc limit 1))
  from public.depots d
  join public.clients c on c.id = d.client_id
  join public.boutiques b on b.id = d.boutique_id
  join public.pressings p on p.id = d.pressing_id
  where d.jeton_suivi = p_jeton and length(p_jeton) >= 24 and d.deleted_at is null;
$$;

-- 5. Demande de ramassage depuis la page publique
create or replace function public.demander_ramassage(
  p_slug text, p_boutique uuid, p_nom text, p_telephone text, p_adresse text,
  p_repere text default null, p_jour date default null, p_creneau text default 'apres_midi', p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pressing uuid;
  v_client uuid;
  v_tel text := regexp_replace(coalesce(p_telephone, ''), '\D', '', 'g');
  v_debut timestamptz;
  v_fin timestamptz;
  v_jour date := coalesce(p_jour, current_date);
begin
  if length(v_tel) = 13 and left(v_tel, 3) = '225' then v_tel := substr(v_tel, 4); end if;
  if v_tel !~ '^(01|05|07|21|25|27)[0-9]{8}$' then
    raise exception 'Numéro de téléphone invalide (10 chiffres).' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_nom, ''))) < 2 or length(trim(coalesce(p_adresse, ''))) < 3 then
    raise exception 'Indiquez votre nom et votre adresse.' using errcode = '22023';
  end if;
  if v_jour < current_date or v_jour > current_date + 30 then
    raise exception 'Choisissez un jour dans les 30 prochains jours.' using errcode = '22023';
  end if;
  select id into v_pressing from public.pressings
   where slug = lower(trim(p_slug)) and deleted_at is null and statut_abonnement <> 'suspendu';
  if v_pressing is null or not exists (select 1 from public.boutiques where id = p_boutique and pressing_id = v_pressing and actif and deleted_at is null) then
    raise exception 'Pressing introuvable.' using errcode = 'P0002';
  end if;
  select id into v_client from public.clients
   where pressing_id = v_pressing and telephone = v_tel and deleted_at is null limit 1;
  if v_client is null then
    insert into public.clients (pressing_id, nom, telephone, adresse, notes)
    values (v_pressing, left(trim(p_nom), 80), v_tel, left(trim(p_adresse), 200), 'Créé depuis la page en ligne')
    returning id into v_client;
  end if;
  -- Anti-abus : 3 demandes en attente au plus par numéro.
  if (select count(*) from public.commandes_en_ligne where client_id = v_client and statut = 'nouvelle') >= 3 then
    raise exception 'Vous avez déjà des demandes en attente. Le pressing va vous contacter.' using errcode = '22023';
  end if;
  v_debut := (v_jour + case p_creneau when 'matin' then time '08:00' when 'soir' then time '16:00' else time '12:00' end) at time zone 'Africa/Abidjan';
  v_fin := (v_jour + case p_creneau when 'matin' then time '12:00' when 'soir' then time '19:00' else time '16:00' end) at time zone 'Africa/Abidjan';
  insert into public.commandes_en_ligne (pressing_id, boutique_id, client_id, articles, adresse, creneau)
  values (v_pressing, p_boutique, v_client,
          jsonb_build_array(jsonb_build_object('note', left(coalesce(trim(p_note), ''), 500), 'repere', left(coalesce(trim(p_repere), ''), 200))),
          left(trim(p_adresse), 200), v_debut);
  insert into public.livraisons (pressing_id, boutique_id, client_id, type, adresse, repere, creneau_debut, creneau_fin, statut, code_confirmation)
  values (v_pressing, p_boutique, v_client, 'ramassage', left(trim(p_adresse), 200), nullif(left(trim(coalesce(p_repere, '')), 200), ''),
          v_debut, v_fin, 'demande', lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'));
  return jsonb_build_object('ok', true, 'jour', v_jour, 'creneau', p_creneau);
end $$;

revoke all on function public.page_pressing(text) from public;
revoke all on function public.suivi_depot(text) from public;
revoke all on function public.demander_ramassage(text, uuid, text, text, text, text, date, text, text) from public;
grant execute on function public.page_pressing(text) to anon, authenticated;
grant execute on function public.suivi_depot(text) to anon, authenticated;
grant execute on function public.demander_ramassage(text, uuid, text, text, text, text, date, text, text) to anon, authenticated;
grant execute on function public.slug_de(text) to anon, authenticated;
