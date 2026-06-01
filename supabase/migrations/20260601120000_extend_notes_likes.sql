-- =============================================================================
-- Migration: extend_notes_likes
-- Purpose:
--   1. Aumenta o limite de conteúdo das notas (500 -> 1000).
--   2. Adiciona likes_count (contador de curtidas) à tabela notes.
--
-- Estrutura futura:
--   Para curtidas por usuário, criar tabela note_likes (note_id, user_id,
--   created_at, unique(note_id, user_id)) e derivar likes_count dela. Por ora,
--   likes_count é um contador simples persistido direto na nota.
-- =============================================================================

alter table public.notes drop constraint if exists notes_content_check;
alter table public.notes add constraint notes_content_check
  check (char_length(content) between 1 and 1000);

alter table public.notes
  add column if not exists likes_count integer not null default 0
  check (likes_count >= 0);

comment on column public.notes.likes_count
  is 'Total de curtidas da nota. Futuro: derivar de tabela note_likes (curtidas por usuário).';
