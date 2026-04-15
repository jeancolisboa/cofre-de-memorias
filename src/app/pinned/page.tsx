'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
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
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      <main className="flex-1 lg:ml-[220px]">
        <header
          className="px-4 lg:px-8 pt-14 lg:pt-8 pb-4 sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Fixadas
          </h1>
          <p className="meta-label mt-1">
            {memories.length} {memories.length === 1 ? 'memória fixada' : 'memórias fixadas'}
          </p>
        </header>

        <div className="px-4 lg:px-8 space-y-3 pb-28 pt-5 lg:max-w-[720px] lg:w-full">
          {loading && (
            <div className="flex justify-center pt-10">
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {!loading && memories.length === 0 && (
            <div className="text-center pt-20">
              <p className="text-4xl mb-3">⭐</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Nenhuma memória fixada
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Toque na estrela ao criar uma memória.
              </p>
            </div>
          )}

          {memories.map((memory) => (
            <button
              key={memory.id}
              onClick={() => setSelected(memory)}
              className="w-full text-left rounded-[14px] px-4 py-4 active:scale-[0.98]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{memory.mood ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-3 leading-relaxed" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {memory.text}
                  </p>
                  <p className="mt-2" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {memory.location && (
                      <span> · <span style={{ color: 'var(--accent-teal)' }}>●</span> {memory.location}</span>
                    )}
                  </p>
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {memory.tags.map((t) => <span key={t.id} className="tag-chip">#{t.tag}</span>)}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 text-lg" style={{ color: 'var(--accent-amber)' }}>⭐</span>
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
