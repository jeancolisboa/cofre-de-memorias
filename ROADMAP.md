# Cofre de Memórias — Roadmap

## Status atual
**Versão:** 0.7.0
**Última atualização:** 2026-04-26
**Ambiente:** desenvolvimento local (`npm run dev`)

---

## Fases

### ✅ FASE 1 — Base sólida (CONCLUÍDA)

**Objetivo:** fundação funcional, uso pessoal completo.

- [x] Auth Google OAuth via Supabase
- [x] CRUD de memórias (criar, editar, excluir)
- [x] Sheet lateral de edição (slide da direita no desktop, da base no mobile)
- [x] Campos: texto livre, mood (emoji via emoji-mart), música, localização, @pessoas, #tags
- [x] Autocomplete de músicas e pessoas do histórico
- [x] Calendário mensal navegável com drag para criar ranges de datas
- [x] Diferenciação visual no calendário por mood (cor individual por emoji)
- [x] Fixar memórias com destaque no calendário
- [x] Página de fixadas
- [x] Busca full-text com sugestões (pessoas, tags, músicas recentes)
- [x] Estatísticas: total, mês, sequência de dias, top moods/tags/pessoas
- [x] Dark mode / light mode (persistido no localStorage)
- [x] PWA instalável (manifest, ícones, standalone)
- [x] Proteção por autenticação (middleware Next.js)

---

### ✅ FASE 2 — Social e Compartilhamento (CONCLUÍDA)

**Objetivo:** memórias compartilhadas entre pessoas reais.

**Schema (migrations 002 + 003):**
- [x] `profiles` — tabela pública com `display_name`, `avatar_url`, `email`; trigger `on_auth_user_created` para auto-populate; backfill de usuários existentes
- [x] `memory_people.user_id` — coluna nullable para vincular pessoa a usuário real
- [x] `memory_members` — papel de cada usuário em uma memória (owner/contributor/viewer), com `invited_by` e `accepted_at` nullable (NULL = pendente)
- [x] `groups` — grupos com `name`, `emoji`, `created_by`, trigger `updated_at`
- [x] `group_members` — role admin/member por grupo
- [x] `group_memories` — vínculo memória ↔ grupo
- [x] `notifications` — tipos: `memory_tag`, `group_invite`, `group_new_memory`, `on_this_day`
- [x] RLS completo em todas as tabelas de compartilhamento
- [x] `create_group_with_admin(p_name, p_emoji)` — função helper atômica (`SECURITY DEFINER`)
- [x] Realtime habilitado na tabela `notifications`

**Campo de pessoas com vínculo real:**
- [x] Busca em `profiles` com debounce 300ms ao digitar 2+ caracteres
- [x] Dropdown rico: avatar circular (foto ou inicial), nome, email
- [x] Opção "Adicionar como texto livre" sempre disponível
- [x] Chip roxo com ícone de link para usuários vinculados; chip padrão para texto livre
- [x] Navegação por teclado (↑↓ Enter Tab Escape)

**Notificações in-app:**
- [x] Sino no header com badge roxo (máx "9+") para não lidas
- [x] Dropdown com lista das últimas 20 notificações
- [x] "Marcar todas como lidas" no header do dropdown
- [x] Realtime via Supabase `postgres_changes` — badge atualiza sem reload
- [x] Geração automática de `memory_tag` ao salvar memória com usuário marcado
- [x] Aceite/recusa de marcações e convites de grupo diretamente do dropdown

**Grupos:**
- [x] Página `/groups` — lista de grupos do usuário com contadores
- [x] Página `/groups/[id]` — memórias e membros do grupo, abas separadas
- [x] Criar grupo (`GroupCreateSheet`): emoji + nome
- [x] Configurar grupo (`GroupConfigSheet`): editar nome/emoji (admin), sair, deletar
- [x] Adicionar memória ao grupo (`AddMemoryToGroupSheet`): busca e picker de memórias
- [x] Convidar membro (`InviteMemberSheet`): busca em profiles, envia `group_invite`
- [x] Remover membro (admin), remover memória do grupo (sem excluir a memória original)
- [x] Notificação `group_new_memory` enviada a todos os membros ao adicionar memória

**Co-autoria via memory_members:**
- [x] `memory_tag` insere/atualiza `memory_members` ao aceitar convite
- [x] RLS permite que accepted members vejam a memória no calendário

**Indicadores visuais de grupos:**
- [x] Badge 👥 (9px) no emoji da memória nos cards recentes quando pertence a grupo
- [x] Ponto roxo (5px) no canto do dia no calendário quando há memória em grupo
- [x] Seção "Grupos" somente-leitura no sheet de edição da memória

**Schema (migrations 004 + 005):**
- [x] `memory_photos` — tabela de fotos por memória (`storage_path`, `created_at`), RLS por owner
- [x] `memories.deleted_at` — soft delete com lixeira de 30 dias

**Lixeira:**
- [x] Soft delete: `deleted_at` preenchido ao excluir, memória some do calendário
- [x] Lixeira (sidebar) — lista memórias excluídas nos últimos 30 dias
- [x] Ações: "Reviver" (restaura) e exclusão permanente
- [x] Exibição de dias restantes antes da remoção automática

---

### 🔲 FASE 3 — Enriquecimento e Inteligência

**Objetivo:** memórias mais ricas com mídia, contexto e inteligência temporal.

- [ ] **Upload de fotos** — armazenamento no Supabase Storage (`memory-photos`), máx. 5 por memória, signed URLs com TTL
- [ ] **Integração Spotify API** — busca de faixas com preview de 30s, salva `spotify_track_id`
- [ ] **Integração Google Maps API** — autocomplete de localização com coordenadas reais
- [ ] **"On This Day" / Replay do Dia** — notificação diária `on_this_day` para memórias de anos anteriores naquela data
- [ ] **Resumo mensal automático** — gerado no último dia do mês: top mood, pessoa mais marcada, quantidade de memórias
- [ ] **Resumo anual** — retrospectiva de dezembro com highlights do ano
- [ ] **Exportação PDF** — memórias do mês/ano formatadas
- [ ] **Exportação JSON** — backup completo das memórias do usuário

---

### 🔲 FASE 4 — Produção e Mobile

**Objetivo:** app confiável e acessível em qualquer dispositivo, qualquer hora.

- [ ] **Deploy** — domínio próprio, hosting estável (Vercel ou similar)
- [ ] **CI/CD** — GitHub Actions: lint, build e deploy automático no push para main
- [ ] **App mobile React Native + Expo** — compartilha lógica de dados com a versão web
- [ ] **Push notifications** — lembrete diário para registrar o dia, "On This Day"
- [ ] **Onboarding** — fluxo guiado para novos usuários (primeira memória, grupos, configurações)
- [ ] **Suporte offline básico** — PWA com cache local, sincronização ao reconectar

---

### 🔲 FASE 5 — Monetização

**Objetivo:** modelo sustentável sem prejudicar a experiência core.

- [ ] **Plano gratuito** — limites: X memórias/mês, sem fotos, sem exportação, 1 grupo
- [ ] **Plano premium** — ilimitado: memórias, grupos, fotos, exportação PDF/JSON, Spotify
- [ ] **Gift** — presentear 1 mês premium para um amigo diretamente pelo app

---

## Changelog

### 2026-04-26 — v0.7.0 · Fixes de layout desktop + TypeScript

**Fixadas no desktop**
- Grid de cards agora usa `.grid-cards` (responsive grid) em vez de `flex-wrap` — corrige cards esticados a 100% de largura

**Estatísticas no desktop/mobile**
- KPIs: 2 colunas no mobile, 4 no desktop (antes travado em 4 sem responsividade)
- Seção Pessoas/Tags: empilhada no mobile, lado a lado a partir de `sm:`

**Grupo detalhe (`/groups/[id]`)**
- `position: 'relative'` no style do header sobrescrevia o `sticky` do className — removido
- `pt-14` (56px) inflava o header no mobile — corrigido para `pt-4 lg:pt-0` com `lg:h-[60px]`
- `lg:ml-[220px]` corrigido para `lg:ml-[200px]` (coincidir com a largura real da sidebar)

**Fix TypeScript / 404 em `/groups`**
- `MemoryModal.tsx`: cast inválido `r.groups as { name; emoji }` → `as unknown as { name; emoji }` (Supabase inferia array, TypeScript rejeitava, causava falha de compilação e 404)

---

### 2026-04-26 — v0.4.0 · Social e Compartilhamento

**Migration 002 — compartilhamento, grupos e notificações**
- `memory_members` — papel por memória (owner/contributor/viewer), `invited_by`, `accepted_at` nullable, UNIQUE `(memory_id, user_id)`
- `groups` — `name`, `emoji`, `created_by`, trigger `updated_at` automático
- `group_members` — role admin/member por grupo, UNIQUE `(group_id, user_id)`
- `group_memories` — vínculo memória ↔ grupo, UNIQUE `(group_id, memory_id)`
- `notifications` — tipos: `memory_tag`, `group_invite`, `group_new_memory`, `on_this_day`; campos: `user_id`, `type`, `memory_id?`, `group_id?`, `from_user_id?`, `meta jsonb`, `read_at?`
- RLS completo em todas as tabelas; policy `"Users can manage own memories"` substituída por 4 granulares
- `create_group_with_admin(p_name, p_emoji)` — função helper atômica (`SECURITY DEFINER`)
- Realtime habilitado na tabela `notifications`

**Migration 003 — perfis públicos + user_id em pessoas**
- `profiles` — tabela pública com `display_name`, `avatar_url`, `email`; trigger `on_auth_user_created`; backfill de usuários existentes
- `memory_people.user_id` — coluna nullable para vincular pessoa a usuário real

**Campo de pessoas com autocomplete de usuários reais**
- Busca em `profiles` com debounce 300ms ao digitar 2+ caracteres
- Dropdown rico: avatar circular (foto ou inicial), nome, email
- Opção "Adicionar como texto livre" sempre disponível
- Chip roxo com ícone de link para usuários vinculados; chip padrão para texto livre
- Navegação por teclado (↑↓ Enter Tab Escape)
- Histórico local (1 char) preservado como fallback

**Notificações in-app**
- Sino no header com badge roxo (máx "9+") para não lidas
- Dropdown 320px com lista das últimas 20 notificações
- Textos por tipo: `memory_tag`, `group_invite`, `group_new_memory`, `on_this_day`
- Item não lido: fundo roxo sutil + bolinha indicadora
- "Marcar todas como lidas" no header do dropdown
- Realtime via Supabase `postgres_changes` — badge e lista atualizam sem reload
- Geração automática de `memory_tag` ao salvar memória com usuário marcado
- Aceite/recusa de marcações e convites diretamente do dropdown

**Grupos (frontend completo)**
- `/groups` — lista de grupos com contadores de membros e memórias
- `/groups/[id]` — abas Memórias / Membros, header global adaptado
- `GroupCreateSheet` — emoji picker + nome, chama `create_group_with_admin`
- `GroupConfigSheet` — editar nome/emoji (admin), sair do grupo, deletar grupo (owner)
- `AddMemoryToGroupSheet` — busca local, INSERT em `group_memories`, notificação automática
- `InviteMemberSheet` — busca em profiles, envia notificação `group_invite`
- Remover membro (admin), remover memória do grupo (sem excluir a original)
- Indicadores visuais: badge 👥 em cards recentes, ponto roxo no calendário, seção "Grupos" no sheet

---

### 2026-04-24 — v0.3.0 · Sheet lateral, emoji-mart, dark mode polish

**Editor em sheet lateral**
- Editor migrado de tela cheia para sheet deslizante (480px da direita no desktop, base no mobile)
- Overlay com backdrop-blur, fecha ao clicar fora ou pressionar Escape
- Animação `translateX` no desktop e `translateY` no mobile

**Mood picker expandido**
- Integração emoji-mart v5 para seleção de qualquer emoji
- 16 emojis padrão + botão "+" que abre o picker completo
- Banner de mood na parte superior do sheet (120px, emoji 52px, gradiente por mood)
- Tipo `Mood` alterado de union estrita para `string` para suportar qualquer emoji

**Calendário com diferenciação visual por mood**
- Hoje: fundo translúcido roxo + borda, texto `#9B8FFF`
- Início/fim de range salvo: fundo sólido `#9B8FFF`, texto escuro
- Memória simples: fundo e texto na cor do mood
- `MOOD_COLORS` record com mapeamento emoji → `{bg, text}`

**Autocomplete customizado**
- Autocomplete de músicas buscando histórico do Supabase (`memory_music`)
- Dropdown customizado via CSS sem depender do nativo do browser

**Login redesenhado**
- Layout two-column: painel visual esquerdo com gradiente + floating cards animados
- Mobile: painel visual vira header de 40vh

**Busca com sugestões**
- Estado vazio substituído por chips de sugestão: top pessoas, tags recentes, músicas recentes

**Dark mode polish**
- Textarea: fundo `rgba(80,80,100,0.35)` para contraste independente do painel
- Fundo do sheet: `#16161F`, emojis com `opacity: 0.8` e `filter: brightness(1.15)`

---

### 2026-04-15 — v0.2.0 · Design system dark intimate + layout web responsivo

**Design system completo**
- Paleta de cores via CSS variables: modo escuro (`--bg-base: #0D0D0F`) e claro
- Tipografia Inter, classes utilitárias `.screen-title`, `.meta-label`, `.date-display`
- Scrollbar customizada, transições suaves, foco acessível com `--accent-purple`

**Layout responsivo web-first**
- Sidebar fixa (200px) visível em `lg:`, bottom nav só no mobile
- Header sticky com fundo `--bg-base` em todas as telas
- Duas colunas na home: calendário + memórias recentes

**Sidebar — menu de usuário**
- Avatar com iniciais, nome formatado, chevron
- Popover com toggle tema (sol/lua) + logout

---

### 2026-04-14 — v0.1.0 · Fundação

- Projeto Next.js 14 com TypeScript, Tailwind e PWA (next-pwa)
- Supabase configurado: Auth com Google OAuth, banco de dados criado
- Tabelas: `memories`, `memory_music`, `memory_people`, `memory_tags`, `collections`, `collection_memories`
- RLS ativo em todas as tabelas, middleware de autenticação
- Calendário mensal navegável com destaque nos dias com memórias
- Modal de memória com: texto, mood, música, local, @pessoas, #tags, fixar
- Bottom navigation: Calendário, Fixadas, Busca, Stats

---

## Funcionalidades ativas

| Funcionalidade | Status |
|---|---|
| Login com Google OAuth | ✅ |
| CRUD de memórias | ✅ |
| Lixeira com soft delete (30 dias) | ✅ |
| Calendário mensal com drag para ranges | ✅ |
| Diferenciação visual por mood no calendário | ✅ |
| Sheet lateral de edição | ✅ |
| Mood com emoji-mart (qualquer emoji) | ✅ |
| Música com autocomplete do histórico | ✅ |
| @Pessoas com autocomplete de perfis reais | ✅ |
| #Tags com autocomplete | ✅ |
| Fixar memórias | ✅ |
| Busca full-text com sugestões | ✅ |
| Estatísticas (total, mês, sequência, mood, tags, pessoas) | ✅ |
| Tema claro / escuro | ✅ |
| PWA instalável | ✅ |
| Notificações in-app com Realtime | ✅ |
| Aceite/recusa de marcações e convites | ✅ |
| Grupos (criar, configurar, membros, memórias) | ✅ |
| Indicadores visuais de grupos no calendário e cards | ✅ |
| Seção "Grupos" somente-leitura no editor de memória | ✅ |

---

## Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + performance mobile |
| Auth | Supabase Auth + Google OAuth | Zero fricção para o usuário |
| Banco | Supabase (PostgreSQL) | RLS nativo, Realtime disponível |
| Estilo | Tailwind CSS + dark: class | Tema claro/escuro sem library extra |
| Emojis | emoji-mart v5 | Picker completo + tree-shakeable |
| PWA | next-pwa | Integração direta com Next.js |
| Datas | date-fns + ptBR locale | Leve, tree-shakeable |
| Navegação de cards | Next.js `<Link>` | Navegação via âncora nativa, sem dependência de handler JS |

---

## Sessões de trabalho

| Data | O que foi feito |
|---|---|
| 2026-04-26 | v0.7.0 — Fixes de layout desktop (fixadas, stats, grupos header), TypeScript/404 em /groups |
| 2026-04-26 | v0.4.0 — Fase 2 completa: grupos, notificações, aceite/recusa, indicadores visuais, fixes de header e navegação |
| 2026-04-24 | Sheet lateral, emoji-mart, autocomplete de músicas, calendar mood colors, login redesign, dark mode polish |
| 2026-04-15 | Design system dark intimate, layout web responsivo, sidebar com menu de usuário |
| 2026-04-14 | Setup completo, Supabase configurado, OAuth funcional, redesign visual, fix calendário |
