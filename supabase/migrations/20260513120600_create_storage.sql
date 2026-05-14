-- =============================================================================
-- Migration: create_storage
-- Purpose:   Bucket privado 'memories-photos' + policies de storage.objects.
--
-- Estrutura de paths: {user_id}/{date_id}/{uuid}.{ext}
--
-- O bucket é PRIVADO: o frontend nunca acessa o arquivo direto — o servidor
-- gera signed URLs com TTL (ex: 1h) sob demanda. Isso garante:
--   * Mesmo que uma URL vaze, ela expira.
--   * Não há listagem pública do bucket.
--   * Toda leitura passa pela RLS.
--
-- As policies abaixo casam (storage.foldername(name))[1] = auth.uid()::text,
-- ou seja, "a primeira pasta do path tem que ser o id do usuário".
-- Isso impede qualquer operação fora do diretório próprio.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories-photos',
  'memories-photos',
  false,                                            -- private
  5 * 1024 * 1024,                                  -- 5 MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Policies em storage.objects (escopadas ao bucket memories-photos).
-- ---------------------------------------------------------------------------

-- SELECT: ler arquivos apenas da própria pasta.
create policy "memories_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'memories-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: subir arquivos apenas para a própria pasta.
create policy "memories_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memories-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: regravar (overwrite/upsert) apenas em arquivos próprios.
create policy "memories_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'memories-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'memories-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: apagar apenas arquivos próprios.
create policy "memories_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memories-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
