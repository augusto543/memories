# Correção de exclusão lógica bloqueada pelo RLS

## Sintoma

O app exibe `Não foi possível apagar a nota. Verifique suas permissões.` quando tenta marcar `is_deleted = true`. Isso pode acontecer quando a política SELECT de Supabase/PostgREST oculta a nova versão da linha no mesmo UPDATE.

## Passos para aplicar em produção

1. No **Supabase SQL Editor** do projeto de produção, execute todo o conteúdo de [20261106120800_owner_soft_delete_rpc.sql](../supabase/migrations/20261106120800_owner_soft_delete_rpc.sql).
2. Confirme que as três funções foram instaladas usando a consulta abaixo.
3. Confira que o deploy da Vercel referente à última revisão da branch `main` está como **Ready**. Se estiver como Error, procure as linhas `Failed to compile` / `Type error` no Build Logs.
4. Entre no app com uma conta e crie uma nota. Exclua a própria nota; ela deve desaparecer da Home e de Notas sem ser removida do banco.
5. Confira também excluir um encontro e uma foto. Nenhum objeto do bucket deve ser apagado.
6. Repita com uma segunda conta; uma conta **não** deve apagar registros privados pertencentes à outra.

A migration não remove registros, não altera as políticas SELECT e não concede permissão de exclusão para outra pessoa. Cada RPC faz uma verificação direta de `auth.uid()` no banco.

## Verificação de funções (somente leitura)

```sql
select p.proname as funcao,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_pode_executar,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_pode_executar
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'soft_delete_my_note',
    'soft_delete_my_date',
    'soft_delete_my_photo'
  )
order by p.proname;
```

Devem aparecer **3 linhas**, com `security_definer=true`, `authenticated_pode_executar=true`, `anon_pode_executar=false`.

## Observação

O compartilhamento de notas entre membros de um casal ainda não está implementado. A autorização continua sendo **somente o proprietário da nota**.
