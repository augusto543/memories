-- Protect stored originals even if a client calls the Storage API directly.
-- Administrators using service_role can still recover/manage files.
drop policy if exists memories_photos_delete_own on storage.objects;
-- Existing draft uploads may remain orphaned after a failed create; schedule
-- privileged cleanup only after defining a safe retention policy.
