'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import MemoryModal from '@/components/MemoryModal';
import { createClient } from '@/lib/supabase/client';
import type { Memory } from '@/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);
  const supabase = createClient();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('memories')
      .select('*, memory_music(*), memory_people(*), memory_tags(*)')
      .eq('user_id', user.id)
      .ilike('text', `%${q}%`)
      .order('date', { ascending: false })
      .limit(30);

    setResults((data ?? []).map((m) => ({
      ...m,
      people: m.memory_people,
      tags: m.memory_tags,
      music_data: m.memory_music?.[0] ?? null,
    })));
    setLoading(false);
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[#F9F8F6] dark:bg-[#0D0D14]">
      <header className="px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Busca</h1>
        <div className="flex items-center gap-3 bg-white dark:bg-[#161622] border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 shadow-sm shadow-gray-50 dark:shadow-none">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="Buscar nas memórias…"
            autoFocus
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-sm"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="px-4 space-y-3 pb-28">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="w-5 h-5 rounded-full border-2 border-violet-300 dark:border-violet-800 border-t-violet-600 animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center pt-12">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum resultado para <span className="font-medium">&quot;{query}&quot;</span>
            </p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center pt-12 text-gray-400">
            <p className="text-3xl mb-3">✨</p>
            <p className="text-sm">Digite para buscar nas suas memórias</p>
          </div>
        )}

        {results.map((memory) => (
          <button
            key={memory.id}
            onClick={() => setSelected(memory)}
            className="w-full text-left bg-white dark:bg-[#161622] rounded-2xl px-4 py-4 border border-gray-100 dark:border-white/8 active:scale-[0.98] transition-transform shadow-sm shadow-gray-50 dark:shadow-none"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{memory.mood ?? '📝'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">{memory.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
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
