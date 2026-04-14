# Cofre de Memórias — Setup

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e rode o arquivo `supabase/migrations/001_init.sql`
3. Vá em **Authentication → Providers** e habilite **Google OAuth**
   - Configure `Redirect URL`: `https://seu-domínio.com/auth/callback`

## 2. Variáveis de ambiente

Edite `.env.local` com os valores reais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Encontre esses valores em: **Settings → API** no dashboard do Supabase.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

## 4. PWA

Para testar o PWA localmente use `npm run build && npm start` e acesse via HTTPS
(ou use `ngrok` para tunelizar).

Os ícones estão em `public/icons/`. Substitua pelos ícones finais da marca.

## Estrutura

```
src/
  app/
    page.tsx          # Página principal com calendário
    login/page.tsx    # Login com Google
    pinned/page.tsx   # Memórias fixadas
    search/page.tsx   # Busca full-text
    stats/page.tsx    # Estatísticas
    auth/callback/    # Callback OAuth
  components/
    Calendar.tsx      # Calendário mensal navegável
    MemoryModal.tsx   # Modal full-screen criar/editar memória
    BottomNav.tsx     # Barra de navegação inferior
  lib/supabase/
    client.ts         # Cliente browser
    server.ts         # Cliente server (SSR)
  types/index.ts      # Tipos TypeScript
supabase/
  migrations/001_init.sql  # Schema completo com RLS
```
