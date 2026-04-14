'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import MemoryModal from '@/components/MemoryModal';
import { createClient } from '@/lib/supabase/client';
import type { Memory } from '@/types';

export default function PinnedPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Memory | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('memories')
        .select('*, memory_music(*), memory_people(*), memory_tags(*)')
        .eq('user_id', user.id)
        .eq('is_pinned', true)
        .order('date', { ascending: false });

      if (data) setMemories(data.map((m) => ({
        ...m,
        people: m.memory_people,
        tags: m.memory_tags,
        music_data: m.memory_music?.[0] ?? null,
      })));
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[#F9F8F6] dark:bg-[#0D0D14]">
      <header className="px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Fixadas</h1>
        <p className="text-xs text-gray-400 mt-0.5">{memories.length} {memories.length === 1 ? 'memória fixada' : 'memórias fixadas'}</p>
      </header>

      <div className="px-4 space-y-3 pb-28">
        {loading && (
          <div className="flex justify-center pt-10">
            <div className="w-5 h-5 rounded-full border-2 border-violet-300 dark:border-violet-800 border-t-violet-600 animate-spin" />
          </div>
        )}

        {!loading && memories.length === 0 && (
          <div className="text-center pt-20 text-gray-300 dark:text-gray-600">
            <p className="text-4xl mb-3">⭐</p>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma memória fixada</p>
            <p className="text-xs mt-1 text-gray-400">Toque na estrela ao criar uma memória.</p>
          </div>
        )}

        {memories.map((memory) => (
          <button
            key={memory.id}
            onClick={() => setSelected(memory)}
            className="w-full text-left bg-white dark:bg-[#161622] rounded-2xl px-4 py-4 border border-gray-100 dark:border-white/8 active:scale-[0.98] transition-transform shadow-sm shadow-gray-50 dark:shadow-none"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{memory.mood ?? '📝'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">{memory.text}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {memory.location && ` · ${memory.location}`}
                </p>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {memory.tags.map((t) => <span key={t.id} className="tag-chip">#{t.tag}</span>)}
                  </div>
                )}
              </div>
              <span className="text-amber-400 flex-shrink-0 text-lg">⭐</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <MemoryModal
          date={new Date(selected.date + 'T12:00:00')}
          memory={selected}
          onClose={() => setSelected(null)}
          onSave={async () => window.location.reload()}
        />
      )}

      <BottomNav />
    </main>
  );
}
