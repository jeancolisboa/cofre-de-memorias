# Cofre de Memórias — Roadmap

## Status atual
**Versão:** 0.3.0
**Última atualização:** 2026-04-24
**Ambiente:** desenvolvimento local (`npm run dev`)

---

## Changelog

### 2026-04-24 — v0.3.0 · Sheet lateral, emoji-mart, dark mode polish

**Editor em sheet lateral**
- Editor de memória migrado de tela cheia para sheet deslizante (480px da direita no desktop, base no mobile)
- Overlay com backdrop-blur, fecha ao clicar fora ou pressionar Escape
- Animação `translateX` no desktop e `translateY` no mobile
- Fix crítico: `useEffect` dividido em dois (overflow em `[]`, Escape em `[onClose]`) para evitar body overflow travado ao fechar

**Mood picker expandido**
- Integração com emoji-mart v5 (`@emoji-mart/data` + `@emoji-mart/react`) para seleção de qualquer emoji
- 16 emojis padrão com labels + botão "+" que abre o picker completo
- Banner de mood na parte superior do sheet (120px, emoji 52px, gradiente por mood)
- Tipo `Mood` alterado de union estrita para `string` para suportar qualquer emoji

**Calendário com diferenciação visual por mood**
- Hoje: fundo translúcido roxo + borda `rgba(155,143,255,0.4)`, texto `#9B8FFF`
- Início/fim de range salvo: fundo sólido `#9B8FFF`, texto escuro `#0D0D0F` (destaque forte)
- Memória simples: fundo translúcido na cor do mood, texto na cor do mood
- Mid-range: texto `#C4BEFF` (sutil, sem fundo)
- `moodMap` e `ranges` enriquecidos com mood passados como props para o Calendar
- `MOOD_COLORS` record com mapeamento emoji → `{bg, text}`

**Autocomplete customizado**
- Autocomplete de músicas buscando histórico do Supabase (`memory_music`)
- Dropdown customizado via CSS (`.field-ac-wrapper`, `.custom-dropdown`, `.dropdown-item`) sem depender do nativo do browser
- `autoComplete="off"` + `autoCorrect="off"` + `spellCheck={false}` em todos os inputs

**Login redesenhado**
- Layout two-column: painel visual esquerdo com gradiente + 3 floating cards animados; painel do form direito (400px)
- Mobile: painel visual vira header de 40vh
- Animação `float` com `keyframes` diferente para cada card

**Busca com sugestões**
- Estado vazio substituído por chips de sugestão: top pessoas, tags recentes, músicas recentes
- Sugestões calculadas com `useMemo` a partir de todas as memórias

**Stats com cores por mood**
- Barras de mood usam `MOOD_COLORS[mood]` por emoji, eliminando cor única

**Dark mode polish**
- Textarea: fundo `rgba(80,80,100,0.35) !important` — azul-cinza sólido para contraste independente do painel
- Fundo do sheet: `#16161F` (era `#0F0F14`)
- Emojis: `opacity: 0.8`, `filter: brightness(1.15)` — removida dessaturação
- Seção de campos: `background: rgba(255,255,255,0.02)`, separadores `rgba(255,255,255,0.06)`
- Ícones de campo: `#9B8FFF` com `opacity: 0.65`
- Botão deletar: `color: #E24B4A`, `opacity: 0.7` → hover `1`

---

### 2026-04-15 — v0.2.0 · Design system dark intimate + UX/UI

**Design system completo**
- Paleta de cores via CSS variables: modo escuro (`--bg-base: #0D0D0F`) e claro (`--bg-base: #F5F4F0`)
- Tipografia: Inter (Google Fonts), classes utilitárias `.screen-title`, `.meta-label`, `.date-display`
- Scrollbar customizada, transições suaves globais, foco acessível com `--accent-purple`
- Tailwind extendido com tokens `vault.*` mapeados para as variáveis

**Layout responsivo web-first**
- Sidebar fixa (220px) visível em `lg:`, com logo "COFRE DE MEMÓRIAS" em estilo meta-label
- Bottom nav só no mobile (`lg:hidden`), ícones SVG com ponto indicador no item ativo
- Header sticky com fundo `--bg-base` em todas as telas

**Tela principal — duas colunas**
- Coluna esquerda: calendário (max 560px), coluna direita: memórias recentes (320px, sticky)
- Em mobile/tablet: coluna única, memórias abaixo do calendário
- Scroll com mouse corrigido: removido `overflow-x: hidden` do `html`, wrappers sem `min-h-screen`

**Editor de memória (MemoryModal)**
- Textarea auto-resize via `scrollHeight`, min-height 120px, fonte 15px/1.7, placeholder em `--text-muted`
- Campos compactos: altura 44px, `align-items: center`, ícone 16px
- `ChipField` para pessoas/tags: cresce verticalmente só quando há chips

**Tela de estatísticas**
- Layout duas colunas (max-width 1100px): esquerda (mood), direita (pessoas + tags)
- Grid de métricas 2×2 mobile → 4×1 desktop

**Sidebar — menu de usuário**
- Avatar com iniciais, nome formatado ("Jean L."), chevron
- Popover acima com: toggle tema (sol/lua) + logout
- Fecha ao clicar fora via `mousedown` listener

---

### 2026-04-14 — v0.1.0 · Fundação
- Projeto Next.js 14 criado com TypeScript, Tailwind e PWA (next-pwa)
- Manifest PWA: nome "Cofre de Memórias", short_name "Vault", display standalone, tema escuro
- Supabase configurado: Auth com Google OAuth, banco de dados criado
- Tabelas: `memories`, `memory_music`, `memory_people`, `memory_tags`, `collections`, `collection_memories`
- RLS (Row Level Security) ativo em todas as tabelas
- Middleware de autenticação (redireciona para /login se não autenticado)
- **Calendário mensal** navegável com destaque nos dias com memórias
- **Modal de memória** full-screen com: texto, mood (emoji), música, local, @pessoas, #tags, fixar
- **Bottom navigation**: Calendário, Fixadas, Busca, Stats
- Página de **Fixadas**: lista memórias com is_pinned = true
- Página de **Busca**: full-text search nas memórias
- Página de **Stats**: total, mês atual, sequência de dias, top moods, tags e pessoas
- Redesign completo: tema claro/escuro com toggle, persistido no localStorage
- Logout via menu no header
- Fix: calendário agora renderiza todas as semanas do mês (bug do aspect-square corrigido)

---

## Funcionalidades ativas

| Funcionalidade | Status |
|---|---|
| Login com Google OAuth | ✅ |
| Logout | ✅ |
| Calendário mensal navegável | ✅ |
| Drag para selecionar range de datas | ✅ |
| Criar memória por dia | ✅ |
| Editar memória existente | ✅ |
| Excluir memória | ✅ |
| Campo: texto livre | ✅ |
| Campo: mood (qualquer emoji via emoji-mart) | ✅ |
| Campo: música com autocomplete do histórico | ✅ |
| Campo: localização | ✅ |
| Campo: @pessoas | ✅ |
| Campo: #tags | ✅ |
| Fixar memória (pin) | ✅ |
| Página de fixadas | ✅ |
| Busca por texto | ✅ |
| Sugestões na busca (pessoas, tags, músicas) | ✅ |
| Estatísticas: total, mês, sequência | ✅ |
| Estatísticas: top moods (cores por mood), tags, pessoas | ✅ |
| Calendário com diferenciação visual por mood | ✅ |
| Tema claro / escuro | ✅ |
| PWA instalável | ✅ |
| Proteção por autenticação | ✅ |

---

## Backlog

### Alta prioridade
- [ ] Upload de fotos/imagens nas memórias
- [ ] Visualização de memória em modo leitura (sem abrir o editor)
- [ ] Swipe para navegar entre dias com memória

### Média prioridade
- [ ] Coleções: agrupar memórias por tema/evento
- [ ] Busca por tag, pessoa ou localização (além de texto)
- [ ] Filtro de período na busca
- [ ] Compartilhar memória (gerar imagem para stories)
- [ ] Notificação push: lembrete diário para registrar o dia
- [ ] Ícones PWA personalizados (substituir placeholder)

### Baixa prioridade / Futuro
- [ ] Exportar memórias (PDF ou JSON)
- [ ] Mapa com localização das memórias
- [ ] "Neste dia X anos atrás" — memórias de datas passadas
- [ ] Modo colaborativo: memórias compartilhadas com outra pessoa
- [ ] Retrospectiva mensal automática

---

## Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + performance mobile |
| Auth | Supabase Auth + Google OAuth | Zero fricção para o usuário |
| Banco | Supabase (PostgreSQL) | RLS nativo, realtime disponível |
| Estilo | Tailwind CSS + dark: class | Tema claro/escuro sem library extra |
| Emojis | emoji-mart v5 | Picker completo + tree-shakeable |
| PWA | next-pwa | Integração direta com Next.js |
| Datas | date-fns + ptBR locale | Leve, tree-shakeable |

---

## Sessões de trabalho

| Data | O que foi feito |
|---|---|
| 2026-04-24 | Sheet lateral, emoji-mart, autocomplete de músicas, calendar mood colors, login redesign, dark mode polish |
| 2026-04-15 | Design system dark intimate, layout web responsivo, sidebar com menu de usuário, UX/UI ajustes |
| 2026-04-14 | Setup completo, Supabase configurado, OAuth funcional, redesign visual, fix calendário |
