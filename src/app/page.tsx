'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Calendar from '@/components/Calendar';
import BottomNav from '@/components/BottomNav';
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

  return (
    <main className="flex flex-col min-h-screen bg-[#F9F8F6] dark:bg-[#0D0D14]">
      {/* Header */}
      <header className="px-4 pt-14 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">Cofre de Memórias</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} · {memoriesMap.size} {memoriesMap.size === 1 ? 'memória' : 'memórias'}
          </p>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Avatar / menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-40 bg-white dark:bg-[#1E1E2C] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl py-1 overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
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

      {/* Calendar card */}
      <div className="mx-4 bg-white dark:bg-[#161622] rounded-3xl p-4 shadow-sm shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-white/8">
        <Calendar
          currentMonth={currentMonth}
          memoriesDates={memoriesDates}
          pinnedDates={pinnedDates}
          onMonthChange={setCurrentMonth}
          onDayPress={handleDayPress}
        />
      </div>

      {/* Recent memories */}
      {memoriesMap.size > 0 && (
        <div className="mt-5 px-4">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Recentes</p>
          <div className="space-y-2">
            {Array.from(memoriesMap.entries())
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 3)
              .map(([dateKey, memory]) => (
                <button
                  key={dateKey}
                  onClick={() => {
                    setSelectedDate(new Date(dateKey + 'T12:00:00'));
                    setSelectedMemory(memory);
                  }}
                  className="w-full text-left bg-white dark:bg-[#161622] rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-white/8 active:scale-[0.98] transition-transform shadow-sm shadow-gray-50 dark:shadow-none"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{memory.mood ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {memory.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(dateKey + 'T12:00:00'), "d MMM", { locale: ptBR })}
                        {memory.is_pinned && ' · ⭐'}
                        {memory.location && ` · ${memory.location}`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-violet-300 dark:border-violet-800 border-t-violet-600 animate-spin" />
        </div>
      )}

      {selectedDate && selectedMemory !== undefined && (
        <MemoryModal
          date={selectedDate}
          memory={selectedMemory}
          onClose={() => { setSelectedDate(null); setSelectedMemory(undefined); }}
          onSave={handleSave}
          onDelete={selectedMemory ? handleDelete : undefined}
        />
      )}

      <div className="h-24" />
      <BottomNav />
    </main>
  );
}
