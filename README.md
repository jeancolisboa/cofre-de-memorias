# Cofre de Memórias

Diário pessoal digital com música, pessoas, lugares e emoções. Construído para registrar o que importa — do jeito que você viveu.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS + CSS custom (dark mode via class) |
| Banco | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth — Google OAuth |
| Emojis | emoji-mart v5 |
| Datas | date-fns + locale ptBR |
| Ícones | lucide-react |
| PWA | next-pwa |

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Você precisa de um projeto Supabase configurado com as variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Estrutura

```
src/
├── app/
│   ├── page.tsx               # Home — calendário + lista de memórias
│   ├── login/page.tsx         # Login com Google
│   ├── search/page.tsx        # Busca com sugestões
│   ├── stats/page.tsx         # Estatísticas e mood distribution
│   ├── pinned/page.tsx        # Memórias fixadas
│   ├── groups/
│   │   ├── page.tsx           # Lista de grupos
│   │   └── [id]/page.tsx      # Detalhe do grupo (memórias + membros)
│   └── globals.css            # Design system completo
├── components/
│   ├── MemoryModal.tsx        # Sheet lateral do editor
│   ├── Calendar.tsx           # Calendário com drag para ranges
│   ├── NotificationBell.tsx   # Sino com dropdown e Realtime
│   ├── PeopleField.tsx        # Campo @pessoas com autocomplete de perfis
│   ├── GroupCreateSheet.tsx   # Sheet de criação de grupo
│   ├── GroupConfigSheet.tsx   # Sheet de configuração/exclusão de grupo
│   ├── AddMemoryToGroupSheet.tsx  # Sheet para adicionar memória ao grupo
│   ├── InviteMemberSheet.tsx  # Sheet para convidar membro
│   ├── Sidebar.tsx            # Nav desktop + menu de usuário
│   └── BottomNav.tsx          # Nav mobile
└── types/index.ts             # Types: Memory, Group, GroupMember, etc.
```

## Funcionalidades

- Login com Google OAuth
- Calendário mensal navegável — drag para criar memórias com range de datas
- Editor de memória em sheet lateral (slide da direita no desktop, da base no mobile)
- Campos: texto livre, mood (emoji), música, localização, @pessoas, #tags
- Autocomplete customizado para músicas e pessoas já usadas
- Seletor de mood expandido (16 emojis + picker completo do emoji-mart)
- Fixar memórias com destaque no calendário
- Busca full-text com sugestões de pessoas, tags e músicas recentes
- Estatísticas: total, mês, sequência de dias, distribuição de mood com cor individual
- Tema claro / escuro (persistido no localStorage)
- PWA instalável

## Versão atual

**v0.4.0** — Social e Compartilhamento (grupos, notificações, marcação de pessoas)

## Roadmap

| Fase | Status | Descrição |
|---|---|---|
| Fase 1 — Base sólida | ✅ Concluída | Auth Google, CRUD de memórias, calendário, busca, fixadas, stats, dark mode |
| Fase 2 — Social e Compartilhamento | ✅ Concluída | Marcar pessoas, notificações Realtime, grupos, aceite/recusa, co-autoria |
| Fase 3 — Enriquecimento e Inteligência | 🔲 Planejada | Fotos, Spotify, Google Maps, On This Day, resumo mensal/anual, exportação |
| Fase 4 — Produção e Mobile | 🔲 Planejada | Deploy, CI/CD, React Native + Expo, push notifications, PWA offline |
| Fase 5 — Monetização | 🔲 Planejada | Plano gratuito/premium, gift de premium para amigos |

Ver [`roadmap.md`](./roadmap.md) para detalhes completos.
