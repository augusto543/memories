# Memories

Um diário digital privado para casais registrarem encontros, fotos, memórias e avaliações ao longo do tempo.

**Stack:** Next.js 15 · TypeScript · TailwindCSS · shadcn/ui · Supabase (Auth + Postgres + Storage)

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Setup local](#2-setup-local)
3. [Configurar Supabase](#3-configurar-supabase)
4. [Configurar Google OAuth](#4-configurar-google-oauth)
5. [Aplicar migrations](#5-aplicar-migrations)
6. [Rodar localmente](#6-rodar-localmente)
7. [Deploy na Vercel](#7-deploy-na-vercel)
8. [Estrutura do projeto](#8-estrutura-do-projeto)
9. [Modelo de dados e segurança](#9-modelo-de-dados-e-segurança)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Pré-requisitos

- Node.js **≥ 20** (recomendado 22+)
- npm **≥ 10**
- Uma conta no [Supabase](https://supabase.com) (gratuito)
- Uma conta no [Google Cloud Console](https://console.cloud.google.com) (para OAuth)
- (Opcional) Conta na [Vercel](https://vercel.com) para deploy

---

## 2. Setup local

```bash
# 1. Clone (ou descompacte) o projeto
cd memories

# 2. Instale dependências
npm install

# 3. Copie o template de variáveis de ambiente
cp .env.example .env.local
```

Edite `.env.local` — você vai preenchê-lo nas próximas seções.

---

## 3. Configurar Supabase

### 3.1 Criar o projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Escolha região mais próxima (ex: `South America (São Paulo)`)
3. Defina uma senha forte (Postgres root) — guarde, mas **você não vai precisar dela** no app

### 3.2 Pegar as chaves

Em **Project Settings → API**, copie:

| Campo no Supabase | Variável no `.env.local` |
|---|---|
| `Project URL`             | `NEXT_PUBLIC_SUPABASE_URL` |
| `Project API keys → anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

O `NEXT_PUBLIC_SITE_URL` em desenvolvimento é `http://localhost:3000`.

> ⚠️ **Nunca** comite o `service_role` key. Este projeto não usa essa chave — toda persistência roda no contexto do usuário autenticado, protegida por RLS.

---

## 4. Configurar Google OAuth

### 4.1 No Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto
2. **APIs & Services → OAuth consent screen** → User Type **External** → preencha nome do app e e-mail
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs**: adicione exatamente a URL do Supabase:
     ```
     https://<seu-project-ref>.supabase.co/auth/v1/callback
     ```
   - O `<seu-project-ref>` está na URL do seu projeto Supabase
4. Salve. Copie **Client ID** e **Client Secret**.

### 4.2 No painel do Supabase

1. **Authentication → Providers → Google**
2. Ative o toggle e cole **Client ID** e **Client Secret**
3. Salve.

### 4.3 Configurar URL de redirect do app

Em **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (dev) ou `https://seu-dominio.vercel.app` (prod)
- **Redirect URLs**: adicione TODAS as URLs onde a app vai rodar:
  ```
  http://localhost:3000/auth/callback
  https://seu-dominio.vercel.app/auth/callback
  ```

---

## 5. Aplicar migrations

As migrations estão em `supabase/migrations/`, numeradas em ordem de execução.

### Opção A — Via Supabase Dashboard (mais simples)

1. **SQL Editor → New query**
2. Para **cada arquivo** em `supabase/migrations/`, **em ordem alfabética**:
   - Abra o arquivo
   - Copie todo o conteúdo
   - Cole no editor e clique em **Run**
3. Verifique em **Database → Tables** que existem: `profiles`, `dates`, `tags`, `date_tags`, `photos`

### Opção B — Via Supabase CLI

```bash
npm install -g supabase

# Vincule ao projeto (cole o ref-id quando pedir)
supabase link --project-ref <seu-project-ref>

# Aplique todas as migrations
supabase db push
```

### 5.1 Verificar o bucket de Storage

Em **Storage**, confirme que existe um bucket `memories-photos`:
- **Public**: `Off`
- **File size limit**: `5 MB`
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

Se não existir, a migration `20260513120600_create_storage.sql` não rodou — execute-a manualmente.

---

## 6. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Você deve ser redirecionado para `/login`. Após login com Google, deve cair em `/timeline` (vazia).

### Comandos úteis

| Comando | Descrição |
|---|---|
| `npm run dev`        | Servidor de desenvolvimento (Turbopack quando disponível) |
| `npm run build`      | Build de produção |
| `npm run start`      | Sobe o build de produção |
| `npm run lint`       | ESLint (next/typescript) |
| `npm run type-check` | `tsc --noEmit` |

---

## 7. Deploy na Vercel

### 7.1 Via Git (recomendado)

1. Faça push do projeto para um repositório GitHub/GitLab/Bitbucket
2. [vercel.com/new](https://vercel.com/new) → importe o repositório
3. **Environment Variables** — adicione:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   NEXT_PUBLIC_SITE_URL=https://<seu-domínio>.vercel.app
   ```
4. **Deploy**

### 7.2 Depois do primeiro deploy

Volte ao Supabase e adicione a URL de produção em **Authentication → URL Configuration → Redirect URLs**:
```
https://<seu-domínio>.vercel.app/auth/callback
```

Sem isso o login Google retorna ao localhost mesmo em produção.

### 7.3 Custom domain

Se você anexar um domínio customizado:
1. Atualize `NEXT_PUBLIC_SITE_URL` nas env vars
2. Adicione o novo domínio nas Redirect URLs do Supabase
3. Refaça o deploy

---

## 8. Estrutura do projeto

```
memories/
├── src/
│   ├── app/                    Next.js App Router
│   │   ├── (auth)/login/      Login (rota pública)
│   │   ├── (app)/             Rotas autenticadas
│   │   │   ├── timeline/
│   │   │   ├── dashboard/
│   │   │   └── dates/{new, [id], [id]/edit}
│   │   ├── auth/callback/     OAuth callback (Route Handler)
│   │   ├── layout.tsx         Root layout (providers, fonts)
│   │   └── page.tsx           Redirect inteligente
│   ├── components/
│   │   ├── ui/                shadcn primitives
│   │   ├── auth/              GoogleButton, LoginError
│   │   ├── dates/             DateCard, DateForm, PhotoUploader…
│   │   ├── dashboard/         StatCard
│   │   ├── layout/            Navbar, BottomNav, UserMenu
│   │   ├── providers/         ThemeProvider
│   │   └── shared/            ThemeToggle
│   ├── lib/
│   │   ├── supabase/          client, server, middleware, storage
│   │   ├── auth/              requireUser, assertOwnership
│   │   ├── queries/           Leitura (Server Components)
│   │   ├── validations/       Schemas Zod
│   │   ├── actions/result.ts  ActionResult<T>
│   │   ├── constants.ts       PHOTO_LIMITS etc.
│   │   └── utils.ts           cn, formatRating
│   ├── actions/               Server Actions (mutações)
│   │   ├── auth.ts            signOut
│   │   ├── dates.ts           create/update/delete
│   │   ├── photos.ts          upload/draft/delete
│   │   └── tags.ts            create/attach/detach
│   ├── types/                 Tipos do DB
│   └── middleware.ts          Refresh de sessão + guard de rotas
├── supabase/
│   └── migrations/            SQL versionado
└── public/
```

### Separação read vs mutação

- **`src/lib/queries/`** — apenas SELECTs, usados em Server Components. Nunca escrevem.
- **`src/actions/`** — apenas mutações (`"use server"`), retornam `ActionResult<T>`. Chamam `revalidatePath`.

### Defesa em profundidade

Toda mutação:
1. `await requireUser()` — autenticação
2. `safeParse` com Zod — validação de TODO input (inclusive IDs)
3. `await assertOwnsDate(id)` — ownership explícito antes de write
4. RLS no banco — última linha de defesa

---

## 9. Modelo de dados e segurança

### Tabelas

| Tabela | Descrição |
|---|---|
| `profiles`     | Sincronizado de `auth.users` via trigger. Tem `partner_id` para feature futura de casal. |
| `dates`        | Encontros: title, description, location, rating (1-10), happened_at |
| `tags`         | Tags por usuário (UNIQUE user_id + name, citext case-insensitive) |
| `date_tags`    | Junction N:N |
| `photos`       | Vinculado a date_id. Guarda `storage_path`, não URL. |

### RLS policies

Todas as tabelas têm RLS ativado. Resumo:

- **`profiles`** — usuário vê/edita apenas o próprio profile. Inserção só via trigger.
- **`dates`** — `auth.uid() = user_id` em todas as operações; `WITH CHECK` impede transferência de propriedade.
- **`tags`** — idem `dates`.
- **`date_tags`** — RLS transitiva: `EXISTS` em `dates` (e em `tags` no INSERT).
- **`photos`** — RLS transitiva via JOIN com `dates`.
- **`storage.objects`** — escopo por pasta: `(storage.foldername(name))[1] = auth.uid()::text`.

### Limites enforced no banco

| Limite | Onde |
|---|---|
| Máx 10 fotos por encontro     | Trigger `enforce_photo_limit_per_date` |
| Máx 5MB por foto              | `storage.buckets.file_size_limit` |
| MIMEs jpg/png/webp            | `storage.buckets.allowed_mime_types` |
| `rating` entre 1 e 10         | `CHECK` constraint |
| `title.length` 1..120         | `CHECK` constraint |
| `description.length` ≤ 5000   | `CHECK` constraint |
| `tag.name.length` 1..40       | `CHECK` constraint |

### Transações

A criação de encontro é **atomic**: a função PL/pgSQL `create_date_with_relations` insere `dates` + `date_tags` + `photos` na mesma transação Postgres. Se qualquer passo falhar, todos são desfeitos. As fotos no Storage são limpas best-effort em caso de falha do RPC.

---

## 10. Troubleshooting

### Login redireciona para localhost mesmo em produção
Você esqueceu de adicionar a URL de produção em **Supabase → Authentication → URL Configuration → Redirect URLs**.

### `Cannot find module 'autoprefixer'` no build
```bash
npm install -D autoprefixer
```

### `Error: NEXT_PUBLIC_SUPABASE_URL is not defined`
- Verifique que `.env.local` existe e tem as variáveis preenchidas
- Em produção: adicione no painel da Vercel (Settings → Environment Variables)
- Após mudar env vars, **reinicie** o `npm run dev` ou refaça deploy

### Erro `permission denied` ao tentar inserir
Você não está autenticado, ou RLS está bloqueando. Verifique:
1. Que rodou TODAS as migrations
2. Que `auth.users` tem registro para você (`select * from auth.users`)
3. Que o trigger `on_auth_user_created` rodou (deve existir uma linha em `profiles`)

### Imagens não aparecem na timeline
- Verifique que o bucket `memories-photos` existe e está **privado**
- O servidor gera signed URLs com TTL de 1h — basta recarregar a página se expirou
- No console do navegador, veja se a URL contém `/storage/v1/object/sign/...`

### "Limite de 10 fotos por encontro atingido"
Esperado — a trigger no banco enforça. Para mudar, edite a migration `20260513120700_create_rpc_and_limits.sql` (linha do `if v_count >= 10`) e também `src/lib/constants.ts`.

### Build da Vercel falha com timeout em Server Action
Server Actions têm limite de `bodySizeLimit: 10mb` configurado em `next.config.ts`. Uploads são **um por chamada** justamente pra evitar isso. Se mudar a estratégia, ajuste lá.

---

## Funcionalidades futuras (já preparadas no schema)

- **Casal vinculado** — `profiles.partner_id` já existe; basta uma policy adicional permitindo leitura cruzada
- **Retrospectiva anual** — `getDashboardStats` pode evoluir; `happened_at` permite filtrar por ano
- **Insights/AI** — `description` é texto longo, pronto para extração de sentimentos
- **Mapa de memórias** — `location` está livre; pode normalizar para lat/lng depois

---

## Licença

MIT — use livremente, com amor 💛
