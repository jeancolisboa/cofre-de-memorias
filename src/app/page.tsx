'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function HomePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [memoriesMap, setMemoriesMap] = useState<Map<string, Memory>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null | undefined>(undefined);
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

    const { data, error } = await supabase
      .from('memories')
      .select('*, memory_music(*), memory_people(*), memory_tags(*)')
      .eq('user_id', user.id)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'));

    if (!error && data) {
      const map = new Map<string, Memory>();
      data.forEach((m) => map.set(m.date, {
        ...m,
        people: m.memory_people,
        tags: m.memory_tags,
        music_data: m.memory_music?.[0] ?? null,
      }));
      setMemoriesMap(map);
    }
    setLoading(false);
  }, [currentMonth, supabase]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDayPress = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    setSelectedMemory(memoriesMap.get(key) ?? null);
  }, [memoriesMap]);

  const handleSave = useCallback(async (formData: MemoryFormData) => {
    if (!selectedDate) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existing = memoriesMap.get(dateKey);
    let memoryId: string;

    if (existing) {
      const { error } = await supabase.from('memories').update({
        text: formData.text, mood: formData.mood,
        music: formData.music || null, location: formData.location || null,
        is_pinned: formData.is_pinned, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) throw error;
      memoryId = existing.id;
    } else {
      const { data, error } = await supabase.from('memories').insert({
        user_id: user.id, date: dateKey, text: formData.text,
        mood: formData.mood, music: formData.music || null,
        location: formData.location || null, is_pinned: formData.is_pinned,
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
      await supabase.from('memory_people').insert(formData.people.map((name) => ({ memory_id: memoryId, name })));

    await supabase.from('memory_tags').delete().eq('memory_id', memoryId);
    if (formData.tags.length > 0)
      await supabase.from('memory_tags').insert(formData.tags.map((tag) => ({ memory_id: memoryId, tag })));

    await fetchMemories();
  }, [selectedDate, memoriesMap, supabase, fetchMemories]);

  const handleDelete = useCallback(async () => {
    if (!selectedDate || !selectedMemory) return;
    const key = format(selectedDate, 'yyyy-MM-dd');
    await supabase.from('memories').delete().eq('id', selectedMemory.id);
    setMemoriesMap((prev) => { const n = new Map(prev); n.delete(key); return n; });
  }, [selectedDate, selectedMemory, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const memoriesDates = new Set(memoriesMap.keys());
  const pinnedDates = new Set(
    Array.from(memoriesMap.entries()).filter(([, m]) => m.is_pinned).map(([d]) => d)
  );

  const sortedMemories = Array.from(memoriesMap.entries()).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      {/* Main — natural height, body scrolls */}
      <main className="flex-1 lg:ml-[220px]">
        {/* Header */}
        <header
          className="px-4 lg:px-8 pt-14 lg:pt-8 pb-3 flex items-center justify-between sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Cofre de Memórias
            </h1>
            <p className="meta-label mt-1 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} · {memoriesMap.size} {memoriesMap.size === 1 ? 'memória' : 'memórias'}
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Theme toggle — mobile only */}
            <button
              onClick={toggle}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Avatar / menu — mobile only (desktop handled in sidebar) */}
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content — two columns on desktop */}
        <div className="px-4 lg:px-8 py-6">
          <div className="flex gap-6 items-start">

            {/* Left column: calendar (natural width, max 560px) */}
            <div className="flex-1 min-w-0" style={{ maxWidth: '560px' }}>
              <div
                className="rounded-[14px] p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <Calendar
                  currentMonth={currentMonth}
                  memoriesDates={memoriesDates}
                  pinnedDates={pinnedDates}
                  onMonthChange={setCurrentMonth}
                  onDayPress={handleDayPress}
                  memoryCount={memoriesMap.size}
                />
              </div>

              {/* Mobile-only: memories below calendar */}
              {memoriesMap.size > 0 && (
                <div className="lg:hidden mt-6">
                  <p className="meta-label mb-3">Memórias recentes</p>
                  <div className="space-y-2">
                    {sortedMemories.slice(0, 5).map(([dateKey, memory]) => (
                      <MemoryCard
                        key={dateKey}
                        dateKey={dateKey}
                        memory={memory}
                        onClick={() => {
                          setSelectedDate(new Date(dateKey + 'T12:00:00'));
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

            {/* Right column: memories — desktop only, sticky */}
            <div
              className="hidden lg:block flex-shrink-0 sticky top-[88px]"
              style={{ width: '320px' }}
            >
              <p className="meta-label mb-3">Memórias recentes</p>
              {loading && (
                <div className="flex items-center justify-center pt-6">
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
                  />
                </div>
              )}
              {!loading && memoriesMap.size === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Nenhuma memória este mês.
                </p>
              )}
              <div
                className="space-y-2 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              >
                {sortedMemories.map(([dateKey, memory]) => (
                  <MemoryCard
                    key={dateKey}
                    dateKey={dateKey}
                    memory={memory}
                    onClick={() => {
                      setSelectedDate(new Date(dateKey + 'T12:00:00'));
                      setSelectedMemory(memory);
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {selectedDate && selectedMemory !== undefined && (
          <MemoryModal
            date={selectedDate}
            memory={selectedMemory}
            onClose={() => { setSelectedDate(null); setSelectedMemory(undefined); }}
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

function MemoryCard({ dateKey, memory, onClick }: { dateKey: string; memory: Memory; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[14px] px-4 py-3 active:scale-[0.98]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{memory.mood ?? '📝'}</span>
        <div className="flex-1 min-w-0">
          <p className="line-clamp-2 leading-relaxed" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {memory.text}
          </p>
          <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
            {memory.is_pinned && ' · ⭐'}
            {memory.location && ` · ${memory.location}`}
          </p>
        </div>
      </div>
    </button>
  );
}
