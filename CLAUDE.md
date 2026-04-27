# Cofre de Memórias

Next.js 14 + Supabase + Tailwind. App de memórias compartilhadas.

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (auth, Postgres, realtime, storage)
- **Auth**: Supabase Auth com middleware em `src/middleware.ts`

## Estrutura
```
src/
  app/          # Rotas (App Router)
  components/   # Componentes React
  lib/          # Supabase clients e utils
  types/        # TypeScript types
supabase/       # Migrations e configuração
```

## Regras
- Sempre responder em Português
- Respostas curtas e diretas — sem resumo no final
- Não criar arquivos desnecessários
- RLS: policies de junção não podem referenciar de volta a tabela pai (infinite recursion 42P17)
