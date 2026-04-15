'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import MemoryModal from '@/components/MemoryModal';
import { createClient } from '@/lib/supabase/client';
import type { Memory } from '@/types';

const FILTERS = ['Tudo', 'Música', 'Pessoa', 'Local', 'Tag'] as const;
type Filter = typeof FILTERS[number];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('Tudo');
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
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      <main className="flex-1 lg:ml-[220px]">
        <header
          className="px-4 lg:px-8 pt-14 lg:pt-8 pb-4 sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <h1 className="mb-4" style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Busca
          </h1>

          {/* Search input */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
              placeholder="buscar memórias..."
              autoFocus
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)', caretColor: 'var(--accent-purple)' }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium"
                style={
                  activeFilter === f
                    ? { background: 'var(--accent-purple)', color: '#0D0D0F' }
                    : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        <div className="px-4 lg:px-8 space-y-3 pb-28 pt-5 lg:max-w-[720px] lg:w-full">
          {loading && (
            <div className="flex justify-center pt-8">
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center pt-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum resultado para <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>&quot;{query}&quot;</span>
              </p>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center pt-12">
              <p className="text-3xl mb-3">✨</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Digite para buscar nas suas memórias
              </p>
            </div>
          )}

          {searched && !loading && results.length > 0 && (
            <p className="meta-label">{results.length} {results.length === 1 ? 'memória encontrada' : 'memórias encontradas'}</p>
          )}

          {results.map((memory) => (
            <button
              key={memory.id}
              onClick={() => setSelected(memory)}
              className="w-full text-left rounded-[14px] px-4 py-4 active:scale-[0.98]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{memory.mood ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 leading-relaxed" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {memory.text}
                  </p>
                  <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {memory.music_data && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex items-end gap-px h-3">
                        {[1,2,3].map((i) => (
                          <span
                            key={i}
                            className="music-bar w-0.5 rounded-full"
                            style={{ height: '100%', background: 'var(--accent-purple)' }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {memory.music_data.title}{memory.music_data.artist && ` · ${memory.music_data.artist}`}
                      </span>
                    </div>
                  )}
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
    </div>
  );
}
