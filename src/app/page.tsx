'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter, useSearchParams } from 'next/navigation';
import Calendar from '@/components/Calendar';
import BottomNav from '@/components/BottomNav';
import Sidebar, { type SidebarView } from '@/components/Sidebar';
import MemoryModal from '@/components/MemoryModal';
import { createClient } from '@/lib/supabase/client';
import type { Memory, MemoryFormData } from '@/types';
import {
  Plus, Clock, Star, MapPin, ChevronRight,
  Search, MoreHorizontal, Filter, Users, Trash2, Menu,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

// ── Helpers ───────────────────────────────────
function getGreeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name.split(' ')[0] || '';
  return `${time}${first ? `, ${first}` : ''}! 👋`;
}

const MOOD_GRADIENT: Record<string, string> = {
  '😊': 'linear-gradient(135deg,#1E1A2E,#131318)',
  '🥳': 'linear-gradient(135deg,#261A1E,#131318)',
  '😍': 'linear-gradient(135deg,#1F1420,#131318)',
  '🤩': 'linear-gradient(135deg,#1F1D14,#131318)',
  '😌': 'linear-gradient(135deg,#141F1E,#131318)',
  '😢': 'linear-gradient(135deg,#14151F,#131318)',
  '🥰': 'linear-gradient(135deg,#1F1820,#131318)',
};
const moodGrad = (m: string | null) =>
  MOOD_GRADIENT[m ?? ''] ?? 'linear-gradient(135deg,#1A1A22,#131318)';

// ── Page ──────────────────────────────────────
export default function HomePage() {

  // ── Existing logic state (unchanged) ─────────
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [memoriesMap, setMemoriesMap] = useState<Map<string, Memory[]>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null | undefined>(undefined);
  const [pendingDayMemories, setPendingDayMemories] = useState<Memory[] | null>(null);
  const [dragInitialEndDate, setDragInitialEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupMemoryIds, setGroupMemoryIds] = useState<Set<string>>(new Set());
  const [trashedMemories, setTrashedMemories] = useState<Memory[]>([]);
  const router = useRouter();
  const supabase = createClient();

  // ── UI-only state ─────────────────────────────
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<SidebarView>('calendar');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'fixadas' | 'recentes' | 'com_fotos'>('todas');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    const v = searchParams.get('view') as SidebarView | null;
    // Sempre sincroniza — sem ?view= significa calendário
    setActiveView(v ?? 'calendar');
  }, [searchParams]);

  // Abrir modal de nova memória via ?new=1 (ex: botão + do BottomNav)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSelectedDate(new Date());
      setSelectedMemory(null);
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data fetching (unchanged) ─────────────────
  const fetchMemories = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end   = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startKey = format(start, 'yyyy-MM-dd');
    const endKey   = format(end, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('memories')
      .select('*, memory_music(*), memory_people(*), memory_tags(*), memory_photos(*)')
      .is('deleted_at', null)
      .lte('date', endKey)
      .or(`end_date.is.null,end_date.gte.${startKey}`);

    // Lixeira: deletadas nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trashData } = await supabase
      .from('memories')
      .select('*, memory_photos(*)')
      .not('deleted_at', 'is', null)
      .gte('deleted_at', thirtyDaysAgo)
      .order('deleted_at', { ascending: false });
    setTrashedMemories((trashData ?? []).map((m) => ({ ...m, photos: m.memory_photos ?? [] })));
    if (!error && data) {
      // Signed URLs for first photo of each memory
      const firstPhotos: { memId: string; path: string }[] = [];
      data.forEach((m) => {
        const photos = m.memory_photos ?? [];
        if (photos.length > 0) firstPhotos.push({ memId: m.id, path: photos[0].storage_path });
      });
      const photoUrlMap = new Map<string, string>();
      if (firstPhotos.length > 0) {
        const { data: signed } = await supabase.storage
          .from('memory-photos')
          .createSignedUrls(firstPhotos.map((p) => p.path), 3600);
        signed?.forEach((s, i) => { if (s.signedUrl) photoUrlMap.set(firstPhotos[i].memId, s.signedUrl); });
      }

      const map = new Map<string, Memory[]>();
      data.forEach((m) => {
        const mem: Memory = {
          ...m,
          people: m.memory_people,
          tags: m.memory_tags,
          music_data: m.memory_music?.[0] ?? null,
          photos: m.memory_photos ?? [],
          photo_url: photoUrlMap.get(m.id) ?? null,
        };
        map.set(m.date, [...(map.get(m.date) ?? []), mem]);
      });
      setMemoriesMap(map);
      const memIds = data.map((m) => m.id);
      if (memIds.length > 0) {
        const { data: gmData } = await supabase.from('group_memories').select('memory_id').in('memory_id', memIds);
        setGroupMemoryIds(new Set((gmData ?? []).map((r) => r.memory_id)));
      } else {
        setGroupMemoryIds(new Set());
      }
    }
    setLoading(false);
  }, [currentMonth, supabase]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleRangeSelect = useCallback((start: Date, end: Date) => {
    setSelectedDate(start);
    setSelectedMemory(null);
    setDragInitialEndDate(format(end, 'yyyy-MM-dd'));
  }, []);

  const ranges = useMemo(() =>
    Array.from(memoriesMap.values()).flat().filter((m) => m.end_date)
      .map((m) => ({ start: m.date, end: m.end_date!, mood: m.mood ?? null })),
    [memoriesMap]);

  const moodMap = useMemo(() => {
    const map = new Map<string, string | null>();
    memoriesMap.forEach((mems, date) => { map.set(date, mems[0]?.mood ?? null); });
    return map;
  }, [memoriesMap]);

  const handleDayPress = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    const direct = memoriesMap.get(key) ?? [];
    const range  = Array.from(memoriesMap.values()).flat()
      .filter((m) => m.end_date && key > m.date && key <= m.end_date);
    const seen = new Set<string>(); const all: Memory[] = [];
    for (const m of [...direct, ...range]) { if (!seen.has(m.id)) { seen.add(m.id); all.push(m); } }
    if (all.length === 0) { setSelectedDate(date); setSelectedMemory(null); }
    else if (all.length === 1) { setSelectedDate(new Date(all[0].date + 'T12:00:00')); setSelectedMemory(all[0]); }
    else { setSelectedDate(date); setPendingDayMemories(all); }
  }, [memoriesMap]);

  const handleSave = useCallback(async (formData: MemoryFormData) => {
    if (!selectedDate) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    let memoryId: string;
    if (selectedMemory) {
      const { error } = await supabase.from('memories').update({
        text: formData.text, mood: formData.mood, music: formData.music || null,
        location: formData.location || null, is_pinned: formData.is_pinned,
        end_date: formData.end_date || null, updated_at: new Date().toISOString(),
      }).eq('id', selectedMemory.id);
      if (error) throw error;
      memoryId = selectedMemory.id;
    } else {
      const { data, error } = await supabase.from('memories').insert({
        user_id: user.id, date: dateKey, text: formData.text, mood: formData.mood,
        music: formData.music || null, location: formData.location || null,
        is_pinned: formData.is_pinned, end_date: formData.end_date || null,
      }).select().single();
      if (error) throw error;
      memoryId = data.id;
    }
    await supabase.from('memory_music').delete().eq('memory_id', memoryId);
    if (formData.music?.trim()) {
      const parts = formData.music.split(' - ');
      await supabase.from('memory_music').insert({ memory_id: memoryId, title: parts[0]?.trim() || formData.music, artist: parts[1]?.trim() || null });
    }
    await supabase.from('memory_people').delete().eq('memory_id', memoryId);
    if (formData.people.length > 0)
      await supabase.from('memory_people').insert(formData.people.map((p) => ({ memory_id: memoryId, name: p.name, user_id: p.user_id })));
    try {
      const prevIds = new Set((selectedMemory?.people ?? []).map((p) => p.user_id).filter(Boolean));
      const newTagged = formData.people.filter((p) => p.user_id && p.user_id !== user.id && !prevIds.has(p.user_id));
      if (newTagged.length > 0)
        await supabase.from('notifications').insert(newTagged.map((p) => ({
          user_id: p.user_id!, type: 'memory_tag', memory_id: memoryId, from_user_id: user.id,
          meta: { memory_title: formData.text.trim().slice(0, 60) },
        })));
    } catch (e) { console.warn('Notificação não enviada:', e); }
    await supabase.from('memory_tags').delete().eq('memory_id', memoryId);
    if (formData.tags.length > 0)
      await supabase.from('memory_tags').insert(formData.tags.map((tag) => ({ memory_id: memoryId, tag })));
    await fetchMemories();
  }, [selectedDate, selectedMemory, supabase, fetchMemories]);

  const handleDelete = useCallback(async () => {
    if (!selectedDate || !selectedMemory) return;
    const key = format(selectedDate, 'yyyy-MM-dd');
    await supabase.from('memories').update({ deleted_at: new Date().toISOString() }).eq('id', selectedMemory.id);
    setMemoriesMap((prev) => {
      const n = new Map(prev);
      const arr = (n.get(key) ?? []).filter((m) => m.id !== selectedMemory.id);
      if (arr.length === 0) n.delete(key); else n.set(key, arr);
      return n;
    });
    await fetchMemories();
  }, [selectedDate, selectedMemory, supabase, fetchMemories]);

  const handleRestore = useCallback(async (memId: string) => {
    await supabase.from('memories').update({ deleted_at: null }).eq('id', memId);
    setTrashedMemories((prev) => prev.filter((m) => m.id !== memId));
    await fetchMemories();
  }, [supabase, fetchMemories]);

  const handlePermanentDelete = useCallback(async (memId: string) => {
    await supabase.from('memories').delete().eq('id', memId);
    setTrashedMemories((prev) => prev.filter((m) => m.id !== memId));
  }, [supabase]);

  // ── Derived ───────────────────────────────────
  const memoriesDates = new Set(memoriesMap.keys());
  const pinnedDates   = new Set(Array.from(memoriesMap.entries()).filter(([, ms]) => ms.some((m) => m.is_pinned)).map(([d]) => d));
  const totalMemories = Array.from(memoriesMap.values()).reduce((a, ms) => a + ms.length, 0);
  const sortedMemories = Array.from(memoriesMap.entries())
    .flatMap(([dk, ms]) => ms.map((m) => [dk, m] as [string, Memory]))
    .sort(([a], [b]) => b.localeCompare(a));
  const groupDates = useMemo(() => {
    const s = new Set<string>();
    memoriesMap.forEach((ms, dk) => { if (ms.some((m) => groupMemoryIds.has(m.id))) s.add(dk); });
    return s;
  }, [memoriesMap, groupMemoryIds]);

  const highlights = useMemo(() =>
    [...sortedMemories].sort(([, a], [, b]) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).slice(0, 10),
    [sortedMemories]);

  const filteredGrid = useMemo(() => {
    let list = sortedMemories;
    if (activeFilter === 'fixadas') list = list.filter(([, m]) => m.is_pinned);
    if (activeFilter === 'recentes') list = list.slice(0, 20);
    if (activeFilter === 'com_fotos') list = list.filter(([, m]) => m.photo_url);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(([, m]) =>
        m.text.toLowerCase().includes(q) ||
        (m.location ?? '').toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sortedMemories, activeFilter, searchQuery]);

  // People derived from memories
  const peopleFreq = useMemo(() => {
    const map = new Map<string, number>();
    Array.from(memoriesMap.values()).flat().forEach((m) => {
      (m.people ?? []).forEach((p) => { map.set(p.name, (map.get(p.name) ?? 0) + 1); });
    });
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [memoriesMap]);

  const openMemory = useCallback((m: Memory) => {
    setSelectedDate(new Date(m.date + 'T12:00:00'));
    setSelectedMemory(m);
  }, []);

  // ── Layout constants ──────────────────────────
  const SIDEBAR_W = 200;
  const HEADER_H  = 60;

  // ── View title ────────────────────────────────
  const VIEW_LABEL: Record<SidebarView, string> = {
    calendar: 'Calendário', memories: 'Memórias', pinned: 'Fixadas',
    groups: 'Grupos', people: 'Pessoas', search: 'Busca', trash: 'Lixeira',
    settings: 'Configurações', stats: 'Estatísticas',
  };

  // HEADER_H usado para calcular alturas
  const _ = SIDEBAR_W; void _;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── Sidebar (fixo, 200px, altura total) ── */}
      <Sidebar
        activeView={activeView}
        onViewChange={(v) => {
          router.push(v === 'calendar' ? '/' : `/?view=${v}`);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Header (fixo, full-width, acima de tudo) ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        height: `${HEADER_H}px`,
        background: 'var(--bg-base)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '0 24px 0 16px',
      }}>
        {/* Logo + nome (esquerda, largura da sidebar) */}
        <div className="hidden lg:flex" style={{
          width: `${SIDEBAR_W - 16}px`, flexShrink: 0,
          alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
          }}>🔒</div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            Cofre de Memórias
          </span>
        </div>

        {/* Mobile: hamburger + nome */}
        <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
            }}
          >
            <Menu size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
            Cofre de Memórias
          </span>
        </div>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* Busca + Notificações + Nova memória (direita) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }} className="hidden sm:block">
            <Search size={13} style={{
              position: 'absolute', left: '11px', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) router.push('/?view=search');
              }}
              placeholder="Buscar memórias..."
              style={{
                width: '220px', height: '34px',
                paddingLeft: '32px', paddingRight: '12px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '17px', outline: 'none',
                fontSize: '13px', color: 'var(--text-primary)',
              }}
            />
          </div>
          <NotificationBell />
          <button
            onClick={() => { setSelectedDate(new Date()); setSelectedMemory(null); }}
            className="inline-flex"
            style={{
              alignItems: 'center', gap: '6px',
              height: '34px', padding: '0 14px',
              background: 'var(--accent-purple)', border: 'none', borderRadius: '17px',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(155,143,255,0.3)',
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Nova memória</span>
          </button>
        </div>
      </header>

      {/* ── Área principal (abaixo do header, à direita da sidebar) ── */}
      <div style={{
        marginTop: `${HEADER_H}px`,
        height: `calc(100vh - ${HEADER_H}px)`,
        display: 'flex', overflow: 'hidden',
      }} className="lg:ml-[200px]">

        {/* ── Coluna esquerda (scroll independente) ── */}
        <div style={{ flex: '1 1 0%', minWidth: 0, height: '100%', overflowY: 'auto' }} className="px-4 lg:px-8 pt-5 lg:pt-8">

          {/* Saudação */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
              {getGreeting(userName)}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })} · {totalMemories} {totalMemories === 1 ? 'memória' : 'memórias'}
            </p>
          </div>

            {/* ── VIEW: calendar ── */}
            {activeView === 'calendar' && (
              <>
                {/* Calendário + Memórias recentes lado a lado (desktop) / empilhados (mobile) */}
                <div className="flex flex-col lg:flex-row" style={{ gap: '16px', alignItems: 'stretch' }}>
                  {/* Calendário */}
                  <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '16px', padding: '16px',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.15)', height: '100%',
                    }}>
                      <Calendar
                        currentMonth={currentMonth}
                        memoriesDates={memoriesDates}
                        pinnedDates={pinnedDates}
                        ranges={ranges}
                        moodMap={moodMap}
                        groupDates={groupDates}
                        onMonthChange={setCurrentMonth}
                        onDayPress={handleDayPress}
                        onRangeSelect={handleRangeSelect}
                        memoryCount={totalMemories}
                      />
                    </div>
                  </div>

                  {/* Memórias recentes */}
                  <div style={{ flex: '1 1 50%', minWidth: 0, minHeight: '200px' }}>
                    <div style={{
                      background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '16px', padding: '16px',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.15)', height: '100%',
                      display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Memórias recentes</span>
                        <button onClick={() => setActiveView('memories')} style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '11px', cursor: 'pointer' }}>Ver todas →</button>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {loading && <LoadingSpinner />}
                        {!loading && totalMemories === 0 && <EmptyState icon="📭" text="Nenhuma memória este mês." />}
                        {sortedMemories.slice(0, 12).map(([dk, m]) => (
                          <RecentRow key={m.id} dateKey={dk} memory={m} inGroup={groupMemoryIds.has(m.id)} onClick={() => openMemory(m)} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destaques */}
                {highlights.length > 0 && (
                  <section style={{ marginTop: '28px' }}>
                    <SectionHeader title="Destaques" count={highlights.length} />
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }} className="scrollbar-hide">
                      {highlights.map(([dk, m]) => (
                        <HighlightCard key={m.id} dateKey={dk} memory={m} onClick={() => openMemory(m)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Todas as memórias */}
                {sortedMemories.length > 0 && (
                  <section style={{ marginTop: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <SectionHeader title="Todas as memórias" count={filteredGrid.length} noMargin />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(['todas', 'fixadas', 'recentes', 'com_fotos'] as const).map((f) => (
                          <FilterPill
                            key={f}
                            label={f === 'todas' ? 'Todas' : f === 'fixadas' ? '⭐ Fixadas' : f === 'recentes' ? '🕐 Recentes' : '📷 Com fotos'}
                            active={activeFilter === f}
                            onClick={() => setActiveFilter(f)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid-cards">
                      {filteredGrid.map(([dk, m]) => (
                        <GridCard key={m.id} dateKey={dk} memory={m} onClick={() => openMemory(m)} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ── VIEW: memories ── */}
            {activeView === 'memories' && (
              <div style={{ maxWidth: '680px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <SectionHeader title="Memórias" count={filteredGrid.length} noMargin />
                  {(['todas', 'fixadas', 'recentes'] as const).map((f) => (
                    <FilterPill key={f} label={f === 'todas' ? 'Todas' : f === 'fixadas' ? '⭐ Fixadas' : '🕐 Recentes'} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredGrid.map(([dk, m]) => (
                    <MemoryListRow key={m.id} dateKey={dk} memory={m} inGroup={groupMemoryIds.has(m.id)} onClick={() => openMemory(m)} />
                  ))}
                  {filteredGrid.length === 0 && <EmptyState icon="📭" text="Nenhuma memória encontrada." />}
                </div>
              </div>
            )}

            {/* ── VIEW: pinned ── */}
            {activeView === 'pinned' && (
              <div>
                <SectionHeader title="Fixadas" count={sortedMemories.filter(([, m]) => m.is_pinned).length} />
                <div className="grid-cards">
                  {sortedMemories.filter(([, m]) => m.is_pinned).map(([dk, m]) => (
                    <GridCard key={m.id} dateKey={dk} memory={m} onClick={() => openMemory(m)} />
                  ))}
                </div>
                {sortedMemories.filter(([, m]) => m.is_pinned).length === 0 &&
                  <EmptyState icon="⭐" text="Nenhuma memória fixada ainda." />}
              </div>
            )}

            {/* ── VIEW: people ── */}
            {activeView === 'people' && (
              <div style={{ maxWidth: '560px' }}>
                <SectionHeader title="Pessoas" count={peopleFreq.length} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {peopleFreq.map(([name, count]) => (
                    <div key={name} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: '12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(155,143,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700, color: 'var(--accent-purple)',
                      }}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count} {count === 1 ? 'memória' : 'memórias'}</div>
                      </div>
                    </div>
                  ))}
                  {peopleFreq.length === 0 && <div style={{ gridColumn: '1/-1' }}><EmptyState icon="👥" text="Nenhuma pessoa marcada ainda." /></div>}
                </div>
              </div>
            )}

            {/* ── VIEW: search ── */}
            {activeView === 'search' && (
              <div style={{ maxWidth: '680px' }}>
                {/* Barra de busca inline (mobile — a do header fica visível, mas aqui reforça) */}
                <div className="sm:hidden" style={{ position: 'relative', marginBottom: '16px' }}>
                  <Search size={14} style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por texto, local ou tag…"
                    autoFocus
                    style={{
                      width: '100%', height: '40px',
                      paddingLeft: '36px', paddingRight: '12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '12px', outline: 'none',
                      fontSize: '14px', color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {searchQuery.trim()
                  ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{filteredGrid.length} resultado{filteredGrid.length !== 1 ? 's' : ''}</p>
                  : <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Digite para buscar memórias.</p>
                }
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredGrid.map(([dk, m]) => (
                    <MemoryListRow key={m.id} dateKey={dk} memory={m} inGroup={groupMemoryIds.has(m.id)} onClick={() => openMemory(m)} />
                  ))}
                  {searchQuery && filteredGrid.length === 0 && <EmptyState icon="🔍" text="Nenhum resultado encontrado." />}
                </div>
              </div>
            )}

            {/* ── VIEW: trash ── */}
            {activeView === 'trash' && (
              <div style={{ maxWidth: '620px' }}>
                <SectionHeader title="Lixeira" count={trashedMemories.length} />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '-4px' }}>
                  Memórias excluídas são mantidas por 30 dias e depois removidas permanentemente.
                </p>
                {trashedMemories.length === 0 && <EmptyState icon="🗑️" text="A lixeira está vazia." />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trashedMemories.map((m) => (
                    <TrashRow key={m.id} memory={m} onRestore={handleRestore} onDelete={handlePermanentDelete} />
                  ))}
                </div>
              </div>
            )}

            {/* ── VIEW: settings ── */}
            {activeView === 'settings' && (
              <div style={{ maxWidth: '560px' }}>
                <SectionHeader title="Configurações" count={0} />
                <EmptyState icon="⚙️" text="Configurações em breve." />
              </div>
            )}

            {/* Espaço para BottomNav no mobile */}
            <div style={{ height: '80px' }} className="lg:hidden" />
            <div className="hidden lg:block" style={{ height: '40px' }} />
          </div>

        </div>

      {/* ── Multi-memory picker ── */}
      {pendingDayMemories && selectedDate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }} onClick={() => setPendingDayMemories(null)}>
          <div style={{ borderRadius: '24px 24px 0 0', background: 'var(--bg-card)', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} · {pendingDayMemories.length} memórias
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingDayMemories.map((m) => (
                <button key={m.id} onClick={() => { setSelectedDate(new Date(m.date + 'T12:00:00')); setSelectedMemory(m); setPendingDayMemories(null); }}
                  style={{ textAlign: 'left', borderRadius: '14px', padding: '12px 16px', background: 'var(--bg-base)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>{m.mood ?? '📝'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {m.end_date
                          ? `${format(new Date(m.date + 'T12:00:00'), "d MMM", { locale: ptBR })} → ${format(new Date(m.end_date + 'T12:00:00'), "d MMM", { locale: ptBR })}`
                          : format(new Date(m.date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                </button>
              ))}
              <button onClick={() => { setSelectedMemory(null); setPendingDayMemories(null); }}
                style={{ padding: '12px', borderRadius: '14px', fontSize: '13px', border: '1px dashed var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
                + Criar nova memória neste dia
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDate && selectedMemory !== undefined && (
        <MemoryModal
          date={selectedDate}
          memory={selectedMemory}
          initialEndDate={dragInitialEndDate}
          onClose={() => { setSelectedDate(null); setSelectedMemory(undefined); setDragInitialEndDate(null); }}
          onSave={handleSave}
          onDelete={selectedMemory ? handleDelete : undefined}
        />
      )}

      <BottomNav />
    </div>
  );
}

// ── Shared sub-components ─────────────────────

function SectionHeader({ title, count, noMargin }: { title: string; count: number; noMargin?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: noMargin ? 0 : '12px' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
      {count > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{count}</span>}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: '26px', padding: '0 11px', borderRadius: '13px', border: 'none', cursor: 'pointer',
      fontSize: '12px', fontWeight: 500,
      background: active ? 'var(--accent-purple)' : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--text-secondary)',
      outline: active ? 'none' : '1px solid var(--border)',
      transition: 'all 130ms',
    }}>{label}</button>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

// ── RecentRow ─────────────────────────────────
function RecentRow({ dateKey, memory, onClick, inGroup }: { dateKey: string; memory: Memory; onClick: () => void; inGroup?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
      padding: '7px 8px', borderRadius: '12px',
      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      transition: 'background 0.2s', flexShrink: 0,
    }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Thumb + emoji */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '56px', height: '42px', borderRadius: '9px',
          background: memory.photo_url ? `url(${memory.photo_url}) center/cover no-repeat` : moodGrad(memory.mood),
          position: 'relative', overflow: 'hidden',
        }}>
          {inGroup && <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '8px' }}>👥</span>}
        </div>
        {/* Emoji discreto no canto inferior esquerdo */}
        {memory.mood && (
          <span style={{
            position: 'absolute', bottom: '-4px', left: '-4px',
            fontSize: '13px', lineHeight: 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}>{memory.mood}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {memory.text}
        </div>
        <div style={{ fontSize: '11px', color: '#9ba0b3', marginTop: '2px' }}>
          {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
          {memory.location && ` · ${memory.location}`}
        </div>
      </div>

      {memory.is_pinned && <span style={{ fontSize: '12px', color: '#ffd66b', flexShrink: 0 }}>★</span>}
    </button>
  );
}

// ── MemoryListRow (view lista) ────────────────
function MemoryListRow({ dateKey, memory, onClick, inGroup }: { dateKey: string; memory: Memory; onClick: () => void; inGroup?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', borderRadius: '12px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      cursor: 'pointer', marginBottom: '6px', textAlign: 'left',
      transition: 'opacity 100ms',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
        background: moodGrad(memory.mood),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', position: 'relative',
      }}>
        {memory.mood ?? '📝'}
        {inGroup && <span style={{ position: 'absolute', bottom: '-3px', right: '-4px', fontSize: '9px', background: 'var(--bg-card)', borderRadius: '50%', padding: '1px' }}>👥</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {memory.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <Clock size={9} />
          {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
          {memory.location && <><MapPin size={9} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{memory.location}</span></>}
          {(memory.tags ?? []).slice(0, 1).map((t) => (
            <span key={t.tag} style={{ background: 'rgba(155,143,255,0.1)', borderRadius: '4px', padding: '1px 5px', color: 'var(--accent-purple)', fontSize: '10px' }}>
              #{t.tag}
            </span>
          ))}
        </div>
      </div>
      {memory.is_pinned && <Star size={12} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)', flexShrink: 0 }} />}
    </button>
  );
}

// ── HighlightCard ─────────────────────────────
function HighlightCard({ dateKey, memory, onClick }: { dateKey: string; memory: Memory; onClick: () => void }) {
  const bg = memory.photo_url
    ? `url(${memory.photo_url}) center/cover no-repeat`
    : moodGrad(memory.mood);
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, width: '160px', height: '120px', borderRadius: '14px', overflow: 'hidden',
      position: 'relative', cursor: 'pointer', border: 'none', padding: 0,
      background: bg, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)' }} />
      <div style={{ position: 'absolute', top: '9px', left: '9px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.35)', borderRadius: '7px', padding: '2px 7px' }}>
        {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
      </div>
      {memory.mood && <div style={{ position: 'absolute', top: '7px', right: '9px', fontSize: '18px', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>{memory.mood}</div>}
      <div style={{ position: 'absolute', bottom: '9px', left: '9px', right: '9px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memory.text}</div>
        {memory.location && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <MapPin size={8} />{memory.location}
          </div>
        )}
      </div>
    </button>
  );
}

// ── GridCard ──────────────────────────────────
function GridCard({ dateKey, memory, onClick }: { dateKey: string; memory: Memory; onClick: () => void }) {
  const bg = memory.photo_url
    ? `url(${memory.photo_url}) center/cover no-repeat`
    : moodGrad(memory.mood);
  return (
    <button onClick={onClick} className="grid-card-item" style={{
      height: '130px', borderRadius: '14px', overflow: 'hidden',
      position: 'relative', cursor: 'pointer', border: 'none', padding: 0,
      background: bg, boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 55%)' }} />
      {memory.mood && <div style={{ position: 'absolute', top: '7px', right: '8px', fontSize: '17px', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>{memory.mood}</div>}
      {memory.is_pinned && <Star size={10} style={{ position: 'absolute', top: '9px', left: '8px', color: 'var(--accent-amber)', fill: 'var(--accent-amber)' }} />}
      <div style={{ position: 'absolute', bottom: '7px', left: '8px', right: '8px' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
          {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
          {memory.text}
        </div>
      </div>
    </button>
  );
}

// ── TrashRow ──────────────────────────────────
function TrashRow({ memory, onRestore, onDelete }: { memory: Memory; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const deletedAt = memory.deleted_at ? new Date(memory.deleted_at) : null;
  const expiresIn = deletedAt
    ? Math.max(0, 30 - Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 30;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px', borderRadius: '12px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
    }}>
      <div style={{
        width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
        background: memory.photo_url ? `url(${memory.photo_url}) center/cover` : moodGrad(memory.mood),
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      }}>
        {!memory.photo_url && (memory.mood ?? '📝')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {memory.text}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMM yyyy", { locale: ptBR })}
          {' · '}
          <span style={{ color: expiresIn <= 3 ? '#EF4444' : 'var(--text-muted)' }}>
            expira em {expiresIn} {expiresIn === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRestore(memory.id)}
        style={{
          padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
          background: 'rgba(155,143,255,0.12)', border: '1px solid rgba(155,143,255,0.3)',
          color: 'var(--accent-purple)', cursor: 'pointer', flexShrink: 0,
        }}
      >
        Reviver
      </button>
      <button
        onClick={() => onDelete(memory.id)}
        style={{
          padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#EF4444', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// suppress unused import warnings
const _unused = { Users, Filter };
void _unused;
