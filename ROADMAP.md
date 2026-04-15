# Cofre de Memórias — Roadmap

## Status atual
**Versão:** 0.2.0
**Última atualização:** 2026-04-15
**Ambiente:** desenvolvimento local (`npm run dev`)

---

## Changelog

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
| Criar memória por dia | ✅ |
| Editar memória existente | ✅ |
| Excluir memória | ✅ |
| Campo: texto livre | ✅ |
| Campo: mood (emoji) | ✅ |
| Campo: música | ✅ |
| Campo: localização | ✅ |
| Campo: @pessoas | ✅ |
| Campo: #tags | ✅ |
| Fixar memória (pin) | ✅ |
| Página de fixadas | ✅ |
| Busca por texto | ✅ |
| Estatísticas: total, mês, sequência | ✅ |
| Estatísticas: top moods, tags, pessoas | ✅ |
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
| PWA | next-pwa | Integração direta com Next.js |
| Datas | date-fns + ptBR locale | Leve, tree-shakeable |

---

## Sessões de trabalho

| Data | O que foi feito |
|---|---|
| 2026-04-15 | Design system dark intimate, layout web responsivo, sidebar com menu de usuário, UX/UI ajustes |
| 2026-04-14 | Setup completo, Supabase configurado, OAuth funcional, redesign visual, fix calendário |
