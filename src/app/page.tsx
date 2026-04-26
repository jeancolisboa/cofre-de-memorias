'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Calendar from '@/components/Calendar';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import MemoryModal from '@/components/MemoryModal';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import type { Memory, MemoryFormData } from '@/types';
import { Plus, Sun, Moon, LogOut, Clock, Star, MapPin, ChevronRight } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

export default function HomePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [memoriesMap, setMemoriesMap] = useState<Map<string, Memory[]>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null | undefined>(undefined);
  const [pendingDayMemories, setPendingDayMemories] = useState<Memory[] | null>(null);
  const [dragInitialEndDate, setDragInitialEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  const fetchMemories = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const startKey = format(start, 'yyyy-MM-dd');
    const endKey = format(end, 'yyyy-MM-dd');

    // Fetch memories whose range overlaps with the current month:
    // date <= month_end AND (end_date IS NULL OR end_date >= month_start)
    const { data, error } = await supabase
      .from('memories')
      .select('*, memory_music(*), memory_people(*), memory_tags(*)')
      .eq('user_id', user.id)
      .lte('date', endKey)
      .or(`end_date.is.null,end_date.gte.${startKey}`);

    if (!error && data) {
      const map = new Map<string, Memory[]>();
      data.forEach((m) => {
        const mem: Memory = {
          ...m,
          people: m.memory_people,
          tags: m.memory_tags,
          music_data: m.memory_music?.[0] ?? null,
        };
        map.set(m.date, [...(map.get(m.date) ?? []), mem]);
      });
      setMemoriesMap(map);
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
    Array.from(memoriesMap.values())
      .flat()
      .filter((m) => m.end_date)
      .map((m) => ({ start: m.date, end: m.end_date!, mood: m.mood ?? null })),
    [memoriesMap]
  );

  const moodMap = useMemo(() => {
    const map = new Map<string, string | null>();
    memoriesMap.forEach((mems, date) => { map.set(date, mems[0]?.mood ?? null); });
    return map;
  }, [memoriesMap]);

  const handleDayPress = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM-dd');

    const directMemories = memoriesMap.get(key) ?? [];
    const rangeMemories = Array.from(memoriesMap.values())
      .flat()
      .filter((m) => m.end_date && key > m.date && key <= m.end_date);

    // Deduplicate by id
    const seen = new Set<string>();
    const allMemories: Memory[] = [];
    for (const m of [...directMemories, ...rangeMemories]) {
      if (!seen.has(m.id)) { seen.add(m.id); allMemories.push(m); }
    }

    if (allMemories.length === 0) {
      setSelectedDate(date);
      setSelectedMemory(null);
    } else if (allMemories.length === 1) {
      const mem = allMemories[0];
      setSelectedDate(new Date(mem.date + 'T12:00:00'));
      setSelectedMemory(mem);
    } else {
      setSelectedDate(date);
      setPendingDayMemories(allMemories);
    }
  }, [memoriesMap]);

  const handleSave = useCallback(async (formData: MemoryFormData) => {
    if (!selectedDate) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    let memoryId: string;

    if (selectedMemory) {
      const { error } = await supabase.from('memories').update({
        text: formData.text, mood: formData.mood,
        music: formData.music || null, location: formData.location || null,
        is_pinned: formData.is_pinned, end_date: formData.end_date || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedMemory.id);
      if (error) throw error;
      memoryId = selectedMemory.id;
    } else {
      const { data, error } = await supabase.from('memories').insert({
        user_id: user.id, date: dateKey, text: formData.text,
        mood: formData.mood, music: formData.music || null,
        location: formData.location || null, is_pinned: formData.is_pinned,
        end_date: formData.end_date || null,
      }).select().single();
      if (error) throw error;
      memoryId = data.id;
    }

    await supabase.from('memory_music').delete().eq('memory_id', memoryId);
    if (formData.music?.trim()) {
      const parts = formData.music.split(' - ');
      await supabase.from('memory_music').insert({
        memory_id: memoryId,
        title: parts[0]?.trim() || formData.music,
        artist: parts[1]?.trim() || null,
      });
    }

    await supabase.from('memory_people').delete().eq('memory_id', memoryId);
    if (formData.people.length > 0)
      await supabase.from('memory_people').insert(
        formData.people.map((p) => ({ memory_id: memoryId, name: p.name, user_id: p.user_id }))
      );

    // Gera memory_tag — erro aqui NÃO deve impedir salvar a memória
    try {
      const prevUserIds = new Set(
        (selectedMemory?.people ?? []).map((p) => p.user_id).filter(Boolean)
      );
      const newlyTagged = formData.people.filter(
        (p) => p.user_id && p.user_id !== user.id && !prevUserIds.has(p.user_id)
      );
      if (newlyTagged.length > 0) {
        const memTitle = formData.text.trim().slice(0, 60);
        await supabase.from('notifications').insert(
          newlyTagged.map((p) => ({
            user_id: p.user_id!,
            type: 'memory_tag',
            memory_id: memoryId,
            from_user_id: user.id,
            meta: { memory_title: memTitle },
          }))
        );
      }
    } catch (notifErr) {
      console.warn('Notificação não enviada:', notifErr);
    }

    await supabase.from('memory_tags').delete().eq('memory_id', memoryId);
    if (formData.tags.length > 0)
      await supabase.from('memory_tags').insert(formData.tags.map((tag) => ({ memory_id: memoryId, tag })));

    await fetchMemories();
  }, [selectedDate, selectedMemory, supabase, fetchMemories]);

  const handleDelete = useCallback(async () => {
    if (!selectedDate || !selectedMemory) return;
    const key = format(selectedDate, 'yyyy-MM-dd');
    await supabase.from('memories').delete().eq('id', selectedMemory.id);
    setMemoriesMap((prev) => {
      const n = new Map(prev);
      const arr = (n.get(key) ?? []).filter((m) => m.id !== selectedMemory.id);
      if (arr.length === 0) n.delete(key);
      else n.set(key, arr);
      return n;
    });
  }, [selectedDate, selectedMemory, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const memoriesDates = new Set(memoriesMap.keys());
  const pinnedDates = new Set(
    Array.from(memoriesMap.entries())
      .filter(([, mems]) => mems.some((m) => m.is_pinned))
      .map(([d]) => d)
  );

  const totalMemories = Array.from(memoriesMap.values()).reduce((acc, mems) => acc + mems.length, 0);

  const sortedMemories = Array.from(memoriesMap.entries())
    .flatMap(([dateKey, mems]) => mems.map((m) => [dateKey, m] as [string, Memory]))
    .sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      <main className="flex-1 lg:ml-[220px]">
        {/* Header */}
        <header
          className="px-4 lg:px-8 pt-14 lg:pt-8 pb-3 flex items-center justify-between sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h1 className="page-title">Cofre de Memórias</h1>
            <p className="page-subtitle">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} · {totalMemories} {totalMemories === 1 ? 'memória' : 'memórias'}
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <div className="hidden lg:flex items-center gap-2">
              <NotificationBell />
              <button
                className="new-memory-btn"
                onClick={() => { setSelectedDate(new Date()); setSelectedMemory(null); }}
              >
                <Plus size={14} />
                Nova memória
              </button>
            </div>

            <button
              onClick={toggle}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative lg:hidden">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-11 z-20 w-40 rounded-2xl py-1 overflow-hidden"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                      style={{ color: '#EF4444' }}
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6">
          <div className="flex gap-6 items-start">

            <div className="flex-1 min-w-0" style={{ maxWidth: '560px' }}>
              <div
                className="rounded-[14px] p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <Calendar
                  currentMonth={currentMonth}
                  memoriesDates={memoriesDates}
                  pinnedDates={pinnedDates}
                  ranges={ranges}
                  moodMap={moodMap}
                  onMonthChange={setCurrentMonth}
                  onDayPress={handleDayPress}
                  onRangeSelect={handleRangeSelect}
                  memoryCount={totalMemories}
                />
              </div>

              {totalMemories > 0 && (
                <div className="lg:hidden mt-6">
                  <div className="section-label">
                    <Clock size={14} />
                    Memórias recentes
                  </div>
                  <div>
                    {sortedMemories.slice(0, 5).map(([dateKey, memory]) => (
                      <MemoryCard
                        key={memory.id}
                        dateKey={dateKey}
                        memory={memory}
                        onClick={() => {
                          setSelectedDate(new Date(memory.date + 'T12:00:00'));
                          setSelectedMemory(memory);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center pt-10">
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
                  />
                </div>
              )}
            </div>

            <div
              className="hidden lg:block flex-shrink-0 sticky top-[88px]"
              style={{ width: '320px' }}
            >
              <div className="section-label">
                <Clock size={14} />
                Memórias recentes
              </div>
              {loading && (
                <div className="flex items-center justify-center pt-6">
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
                  />
                </div>
              )}
              {!loading && totalMemories === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Nenhuma memória este mês.
                </p>
              )}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              >
                {sortedMemories.map(([dateKey, memory]) => (
                  <MemoryCard
                    key={memory.id}
                    dateKey={dateKey}
                    memory={memory}
                    onClick={() => {
                      setSelectedDate(new Date(memory.date + 'T12:00:00'));
                      setSelectedMemory(memory);
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Multi-memory picker */}
        {pendingDayMemories && selectedDate && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPendingDayMemories(null)}
          >
            <div
              className="rounded-t-3xl p-5"
              style={{ background: 'var(--bg-card)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
              <p className="meta-label mb-3">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} · {pendingDayMemories.length} memórias
              </p>
              <div className="space-y-2">
                {pendingDayMemories.map((mem) => (
                  <button
                    key={mem.id}
                    onClick={() => {
                      setSelectedDate(new Date(mem.date + 'T12:00:00'));
                      setSelectedMemory(mem);
                      setPendingDayMemories(null);
                    }}
                    className="w-full text-left rounded-[14px] px-4 py-3 active:scale-[0.98]"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{mem.mood ?? '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {mem.text}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {mem.end_date
                            ? `${format(new Date(mem.date + 'T12:00:00'), "d MMM", { locale: ptBR })} → ${format(new Date(mem.end_date + 'T12:00:00'), "d MMM", { locale: ptBR })}`
                            : format(new Date(mem.date + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })
                          }
                        </p>
                      </div>
                      <ChevronRight size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSelectedMemory(null);
                    setPendingDayMemories(null);
                  }}
                  className="w-full py-3 rounded-[14px] text-sm mt-1"
                  style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
                >
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

        <div className="h-24 lg:h-8" />
        <BottomNav />
      </main>
    </div>
  );
}

const MOOD_BG: Record<string, string> = {
  '😊': 'rgba(155,143,255,0.14)',
  '😍': 'rgba(255,107,157,0.12)',
  '🤩': 'rgba(255,217,61,0.10)',
  '😌': 'rgba(78,205,196,0.12)',
  '😢': 'rgba(255,107,157,0.12)',
  '😡': 'rgba(239,68,68,0.10)',
  '😴': 'rgba(155,143,255,0.10)',
  '😰': 'rgba(255,107,157,0.12)',
  '🥳': 'rgba(255,217,61,0.10)',
  '🤔': 'rgba(155,143,255,0.10)',
};

function MemoryCard({ dateKey, memory, onClick }: { dateKey: string; memory: Memory; onClick: () => void }) {
  const moodBg = (memory.mood && MOOD_BG[memory.mood]) ?? 'rgba(155,143,255,0.10)';
  return (
    <button onClick={onClick} className="memory-list-item active:opacity-60">
      <span className="memory-emoji-box" style={{ background: moodBg }}>
        {memory.mood ?? '📝'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="memory-card-title">{memory.text}</p>
        <p className="memory-card-meta">
          <Clock size={14} />
          {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
          {memory.is_pinned && (
            <Star size={14} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)', marginLeft: '2px' }} />
          )}
          {memory.location && (
            <>
              <MapPin size={14} style={{ marginLeft: '2px' }} />
              <span>{memory.location}</span>
            </>
          )}
        </p>
      </div>
    </button>
  );
}
