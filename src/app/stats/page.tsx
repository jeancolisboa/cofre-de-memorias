'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/lib/supabase/client';
import type { Mood } from '@/types';

interface Stats {
  total: number;
  thisMonth: number;
  streak: number;
  topMood: Mood | null;
  moodCounts: Record<string, number>;
  topTags: { tag: string; count: number }[];
  topPeople: { name: string; count: number }[];
}

const ACCENT_COLORS = [
  'var(--accent-purple)',
  'var(--accent-pink)',
  'var(--accent-teal)',
  'var(--accent-amber)',
];

const MOOD_COLORS: Record<string, string> = {
  '😊': '#9B8FFF',
  '🥳': '#FF6B9D',
  '😍': '#FF6B9D',
  '🤩': '#FFD93D',
  '😌': '#4ECDC4',
  '🥰': '#FF6B9D',
  '😂': '#FFD93D',
  '😢': '#6B9BFF',
  '🥺': '#C49BFF',
  '😤': '#FF8C6B',
  '😴': '#A0A0B8',
  '🤔': '#9B8FFF',
  '😎': '#4ECDC4',
  '🫶': '#FF6B9D',
  '🌟': '#FFD93D',
  '💫': '#C49BFF',
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const { data: allMemories } = await supabase
        .from('memories')
        .select('id, date, mood, is_pinned')
        .eq('user_id', user.id);

      const memoryIds = (allMemories ?? []).map((m) => m.id);

      const [{ data: monthMemories }, { data: tags }, { data: people }] = await Promise.all([
        supabase.from('memories').select('id').eq('user_id', user.id).gte('date', monthStart),
        supabase.from('memory_tags').select('tag, memory_id').in('memory_id', memoryIds),
        supabase.from('memory_people').select('name, memory_id').in('memory_id', memoryIds),
      ]);

      const moodCounts: Record<string, number> = {};
      (allMemories ?? []).forEach((m) => {
        if (m.mood) moodCounts[m.mood] = (moodCounts[m.mood] ?? 0) + 1;
      });
      const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood ?? null;

      const tagCounts: Record<string, number> = {};
      (tags ?? []).forEach(({ tag }) => { tagCounts[tag] = (tagCounts[tag] ?? 0) + 1; });
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }));

      const peopleCounts: Record<string, number> = {};
      (people ?? []).forEach(({ name }) => { peopleCounts[name] = (peopleCounts[name] ?? 0) + 1; });
      const topPeople = Object.entries(peopleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      const dates = new Set((allMemories ?? []).map((m) => m.date));
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (dates.has(d.toISOString().split('T')[0])) streak++;
        else break;
      }

      setStats({ total: allMemories?.length ?? 0, thisMonth: monthMemories?.length ?? 0, streak, topMood, moodCounts, topTags, topPeople });
      setLoading(false);
    }
    load();
  }, [supabase]);

  const summaryCards = stats ? [
    { label: 'Total', value: stats.total, color: 'var(--accent-purple)' },
    { label: 'Este mês', value: stats.thisMonth, color: 'var(--accent-teal)' },
    { label: 'Sequência', value: `${stats.streak}🔥`, color: 'var(--accent-amber)' },
    { label: 'Mood top', value: stats.topMood ?? '—', color: 'var(--accent-pink)' },
  ] : [];

  return (
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      <main className="flex-1 lg:ml-[220px]">
        <header
          className="px-4 lg:px-8 pt-14 lg:pt-8 pb-4 sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Estatísticas
          </h1>
        </header>

        <div className="px-4 lg:px-8 pb-28 pt-6" style={{ maxWidth: '1100px' }}>
          {loading && (
            <div className="flex justify-center pt-10">
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {stats && (
            <>
              {/* Summary — 2×2 mobile, 4×1 desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {summaryCards.map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-[14px] p-4 text-center"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ fontSize: '28px', fontWeight: 500, color }}>{value}</p>
                    <p className="meta-label mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Two-column layout on desktop */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* Left column: mood distribution */}
                <div className="flex-1 min-w-0 space-y-4">
                  {Object.keys(stats.moodCounts).length > 0 && (
                    <div
                      className="rounded-[14px] p-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <p className="meta-label mb-4">Distribuição de mood</p>
                      <div className="space-y-3">
                        {Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => {
                          const pct = Math.round((count / (stats.total || 1)) * 100);
                          return (
                            <div key={mood} className="flex items-center gap-3">
                              <span className="text-base w-6 flex-shrink-0">{mood}</span>
                              <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--border)' }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: MOOD_COLORS[mood] ?? 'var(--accent-purple)' }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column: tags + people */}
                <div className="w-full lg:w-[360px] flex-shrink-0 space-y-4">
                  {stats.topPeople.length > 0 && (
                    <div
                      className="rounded-[14px] p-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <p className="meta-label mb-3">Pessoas mais mencionadas</p>
                      <div className="space-y-0">
                        {stats.topPeople.map(({ name, count }, i) => (
                          <div key={name}>
                            <div className="flex items-center justify-between py-2.5">
                              <div className="flex items-center gap-3">
                                <span style={{ fontSize: '11px', fontWeight: 500, color: ACCENT_COLORS[i % ACCENT_COLORS.length], width: '16px' }}>
                                  {i + 1}
                                </span>
                                <span
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                                  style={{ background: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', color: 'var(--accent-purple)' }}
                                >
                                  {name[0]?.toUpperCase()}
                                </span>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>@{name}</span>
                              </div>
                              <span
                                className="px-2 py-0.5 rounded-full"
                                style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--border)' }}
                              >
                                {count}×
                              </span>
                            </div>
                            {i < stats.topPeople.length - 1 && (
                              <div style={{ height: '0.5px', background: 'var(--border)' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.topTags.length > 0 && (
                    <div
                      className="rounded-[14px] p-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <p className="meta-label mb-3">Tags mais usadas</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.topTags.map(({ tag, count }) => (
                          <span key={tag} className="tag-chip px-3 py-1 text-sm">
                            #{tag} <span style={{ opacity: 0.5, marginLeft: '4px' }}>{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-24 lg:h-8" />
        <BottomNav />
      </main>
    </div>
  );
}
