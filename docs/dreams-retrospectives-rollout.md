# Sonhos e retrospectivas — publicação segura

## Recursos

### Sonhos e planos (`/dreams`)
- Lista compartilhada apenas por integrantes autenticados do **mesmo casal**.
- Categorias: viagem, encontro, aventura, projeto e outro.
- Etapas: sonho, planejado e realizado; progresso e data desejada.
- Qualquer membro do casal pode criar, atualizar, marcar como realizado e ocultar.
- Sem exclusão física; `is_deleted` e `deleted_at` preservam a linha para recuperação administrativa.
- Contas sem casal recebem um convite para criar seu espaço.

### Retrospectivas (`/retrospectives`)
- Visão mensal/anual: número de encontros, fotos e notas, média de avaliações, cidade recorrente, destaque e distribuição mensal.
- **Somente registros ativos criados pelo próprio usuário** são agregados. O histórico privado de outra conta não é incluído.
- Botão para salvar PNG de 1080×1350 px; compartilhamento nativo em dispositivos compatíveis e download alternativo.
- Não há endpoint público de cartões, upload, publicação automática ou notificação.
- Não requer migration; consulta tabelas já existentes.

## Migration nova

`supabase/migrations/20261106121100_couple_dreams.sql`

Dependências: `couples`, `couple_members`, `public.is_my_couple(uuid)` e `public.set_updated_at()` das migrations anteriores.

**Ordem de publicação:** backup → aplicar SQL em ambiente de teste → validar RLS com 3 contas → aplicar a migration no Supabase produção → fazer merge na `main`.

Não rodar migration sem backup e revisão. O SQL adiciona somente uma tabela, índices, policies RLS, triggers e uma função de exclusão lógica. Nenhuma memória antiga é modificada.

## Consultas de auditoria (somente leitura)

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'couple_dreams';

select policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename='couple_dreams'
order by policyname;

select proname, prosecdef,
  has_function_privilege('authenticated',oid,'EXECUTE') as logged_in,
  has_function_privilege('anon',oid,'EXECUTE') as anonymous
from pg_proc
where pronamespace='public'::regnamespace and proname='soft_delete_couple_dream';
```

Esperado: tabela criada, três policies SELECT/INSERT/UPDATE e **nenhuma policy DELETE**. Função `soft_delete_couple_dream` deve ter `prosecdef=true`, `logged_in=true` e `anonymous=false`.

## Testes de aceitação

1. Integrante A cria sonho; B, do mesmo casal, visualiza e altera status. O progresso reflete a mudança.
2. B adiciona outro sonho, define data futura, edita e marca como realizado.
3. A oculta sonho; item some para A e B; linha permanece `is_deleted=true`.
4. Usuário C não vinculado ao casal não consegue ler, criar, editar ou ocultar sonhos de A/B (RLS e RPC).
5. Tentar modificar `couple_id` e `created_by` por UPDATE deve falhar.
6. Nenhuma conta consegue excluir fisicamente os registros usando papel `authenticated`.
7. Retrospectiva mensal e anual só mostra registros ativos que a conta já podia visualizar; verificar exclusões lógicas em notas, encontros e fotos.
8. Verificar períodos vazios, anos anteriores e mudança de fuso no limite dos meses.
9. Baixar PNG e compartilhar via folha nativa do celular. Verificar que nomes privados só aparecem na imagem após clique explícito.
10. Validar TypeScript, preview Vercel e responsividade no celular.

**Nota:** Uma retrospectiva conjunta de duas contas demandaria implementação posterior de consentimento/permissão de compartilhamento; esta fase é pessoal.
