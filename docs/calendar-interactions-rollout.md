# Calendário e interações — instalação e testes

## Estado da funcionalidade

Esta branch é um MVP em revisão. **Não mesclar na main antes de validar o banco e o build.**

### Calendário
- `/calendar`: visualização mensal dos encontros já registrados e de novas datas especiais.
- Datas especiais pessoais por padrão; se o autor marcar *Compartilhar com meu par*, ambos os membros do casal podem visualizar. Apenas o autor edita e oculta.
- Eventos únicos ou recorrência anual; aniversários de 29/02 são exibidos em 28/02 nos anos não bissextos.
- Avisos configuráveis `0, 1, 3, 7, 14, 30 ou 90` dias antes (ou desativados) na Home e no calendário.
- **Não** há e-mails, push, cron ou lembretes em segundo plano.
- Datas simples são guardadas como `date` (sem hora). O app considera o fuso `America/Belem`.

### Interações
- `/interactions`: nova pergunta a cada segunda-feira, por rotação determinística; uma resposta por pessoa/semana, com opção de editar.
- Histórico das últimas 12 semanas de respostas e comentários/respostas em um nível.
- Restrito a usuários que pertençam ao mesmo `couple_id`. Não compartilha notas, fotos ou encontros históricos.
- Respostas e comentários podem ser ocultados pelo autor com exclusão lógica.

## Instalação em Supabase

Requer as migrations anteriores de casais (incluindo `public.is_my_couple(uuid)`) e `public.set_updated_at()`.

Primeiro teste em um projeto de desenvolvimento. Após validação e backup do banco de produção, no Supabase SQL Editor execute **nesta ordem**:

1. `supabase/migrations/20261106120900_special_events.sql`
2. `supabase/migrations/20261106121000_weekly_interactions.sql`

Elas criam três tabelas, índices, triggers, policies RLS e funções de exclusão lógica. Não apagam nem compartilham registros antigos.

Só depois do banco preparado, mescle o PR para que a Vercel publique o código.

## Auditoria SQL (somente leitura)

```sql
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('special_events','weekly_answers','couple_comments')
order by table_name;

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in ('special_events','weekly_answers','couple_comments')
order by tablename, policyname;

select p.proname, p.prosecdef,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as logged_in_can_run,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_can_run
from pg_proc p
where p.pronamespace='public'::regnamespace
  and p.proname in ('soft_delete_my_special_event','soft_delete_my_weekly_answer',
                   'soft_delete_my_comment','can_reply_to_couple_comment')
order by p.proname;
```

Esperado: três tabelas; RLS sem policy DELETE; quatro funções SECURITY DEFINER com EXECUTE para `authenticated`, não para `anon`.

## Testes com três contas

1. Conta A sem casal: cria data privada. Conta B não a vê.
2. Conta A cria casal e convida B. A marca nova data como compartilhada e B consegue ler, mas não editar nem excluir.
3. Data privada de A continua oculta de B, mesmo vinculados.
4. A responde à pergunta; B vê e responde; B comenta a resposta de A; A responde ao comentário de B.
5. B tenta responder a comentário já respondido (deve falhar, pois o MVP limita a um nível).
6. Conta C, fora do casal, não lê eventos compartilhados, respostas nem comentários do casal.
7. A apaga uma própria data especial, resposta e comentário; as linhas ficam `is_deleted=true`, `deleted_at` preenchido e somem do app. B não pode apagá-las diretamente.
8. Recarregar Home e calendário mostra avisos no período certo. Testar aniversário de 29/02.
9. Não surgem novas permissões de acesso às notas e fotos antigas.
10. Validar `npm run type-check`, build Vercel e navegação no celular.

## Restaurar

A restauração de dados ocultos é administrativa e manual via SQL autenticado com papel privilegiado. Não fornecer `service_role` ao cliente.
