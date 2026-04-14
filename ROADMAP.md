# Cofre de Memórias — Roadmap

## Status atual
**Versão:** 0.1.0
**Última atualização:** 2026-04-14
**Ambiente:** desenvolvimento local (`npm run dev`)

---

## Changelog

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
| 2026-04-14 | Setup completo, Supabase configurado, OAuth funcional, redesign visual, fix calendário |
