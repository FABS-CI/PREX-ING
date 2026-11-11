-- =====================================================================
-- PREX'ING — Stockage des fichiers (logos, photos d'articles, justificatifs, reçus PDF)
-- Convention de chemin : {pressing_id}/{dossier}/{fichier}
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('pressing-files', 'pressing-files', false)
on conflict (id) do nothing;

create policy "pressing_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'pressing-files'
         and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "pressing_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pressing-files'
              and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "pressing_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pressing-files'
         and public.has_role(((storage.foldername(name))[1])::uuid, '{proprietaire,gerant}'));
