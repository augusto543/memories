-- =============================================================================
-- Migration: enable_extensions
-- Purpose:   Habilita extensões necessárias para o schema do Memories.
-- =============================================================================

-- pgcrypto fornece gen_random_uuid() para PKs UUID.
-- (uuid-ossp é alternativa, mas pgcrypto é o padrão recomendado pelo Supabase.)
create extension if not exists "pgcrypto";

-- citext: comparação case-insensitive em e-mails e nomes de tag.
create extension if not exists "citext";
