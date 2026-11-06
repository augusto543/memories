# Publicação controlada — casais e exclusão lógica

> **BLOQUEADO para produção. Não executar ainda.** Este PR é rascunho: o compartilhamento de registros ainda não foi implementado, e o conjunto de migrations ainda não foi testado em uma cópia do banco real.

## Ordem obrigatória quando o PR estiver validado

1. Fazer backup completo do PostgreSQL e verificar a possibilidade de restauração. Fazer inventário dos objetos no bucket privado `memories-photos` (backup do banco não inclui os bytes do Storage).
2. Validar em um projeto Supabase de teste com uma cópia sanitizada dos dados e com pelo menos três contas.
3. Aplicar os arquivos SQL **em ordem** no SQL Editor:
   - `supabase/migrations/20261106120000_soft_delete.sql`
   - `supabase/migrations/20261106120100_soft_delete_policies.sql`
   - `supabase/migrations/20261106120200_couples_foundation.sql`
   - `supabase/migrations/20261106120300_active_photo_limit.sql`
   - `supabase/migrations/20261106120400_couple_invitation_rpc.sql`
   - `supabase/migrations/20261106120500_couple_member_read.sql`
   - `supabase/migrations/20261106120600_preserve_storage_files.sql`
4. Validar os resultados das consultas de verificação abaixo.
5. Somente depois publicar o código correspondente (merge em `main`); o deploy automático da Vercel deve ser acompanhado.

## Verificações de esquema (somente leitura)

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('dates', 'photos', 'notes')
  and column_name in ('is_deleted', 'deleted_at')
order by table_name, column_name;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('couples', 'couple_members', 'couple_invites')
order by table_name;

select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('dates','photos','notes','couples','couple_members','couple_invites'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'memories_photos%')
order by schemaname, tablename, policyname;

select proname, proargtypes::regtype[] as argument_types
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('create_my_couple','issue_couple_invite','accept_couple_invite','enforce_photo_limit_per_date');
```

## Testes de segurança necessários antes da publicação

- Usuário A não consegue ler ou alterar registros privados do usuário B.
- Um terceiro usuário não consegue aceitar convite usado, expirado ou revogado.
- Duas aceitações simultâneas não criam três membros.
- Um parceiro que escolhe manter histórico privado não tem seus registros antigos expostos.
- Excluir foto, nota ou encontro apenas marca `is_deleted`; nenhuma exclusão de arquivo ocorre no Storage.
- Consultas, capas, contagens, tags e estatísticas não mostram registros excluídos.
- Usuário autenticado não pode executar DELETE físico em tabelas de memórias nem no bucket.
- Recuperação administrativa preserva limite de 30 fotos e integridade das relações.
- Criar, editar, remover e visualizar registros funciona em desktop e iPhone.

## Pendências de implementação

- Compartilhamento real de `dates`, `notes`, `photos`, tags, RPC de criação, queries e Storage.
- Exclusão lógica de vínculos `date_tags` (atualmente há DELETE físico na edição de tags).
- Revisão dos fluxos de limpeza de uploads órfãos e de recuperação administrativa.
- Executar type-check, testes de migração e regressão antes do merge.

**Não rodar migrations no banco de produção antes de resolver essas pendências.**
