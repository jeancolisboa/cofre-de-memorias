'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
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

  return (
    <main className="min-h-screen bg-[#F9F8F6] dark:bg-[#0D0D14]">
      <header className="px-4 pt-14 pb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Estatísticas</h1>
      </header>

      <div className="px-4 pb-28 space-y-4">
        {loading && (
          <div className="flex justify-center pt-10">
            <div className="w-5 h-5 rounded-full border-2 border-violet-300 dark:border-violet-800 border-t-violet-600 animate-spin" />
          </div>
        )}

        {stats && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Este mês', value: stats.thisMonth, color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Sequência', value: `${stats.streak}🔥`, color: 'text-amber-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-[#161622] rounded-2xl p-4 text-center border border-gray-100 dark:border-white/8 shadow-sm shadow-gray-50 dark:shadow-none">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Mood chart */}
            {Object.keys(stats.moodCounts).length > 0 && (
              <div className="bg-white dark:bg-[#161622] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm shadow-gray-50 dark:shadow-none">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Mood dominante</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{stats.topMood}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mood mais frequente</p>
                    <p className="text-xs text-gray-400">{stats.topMood ? stats.moodCounts[stats.topMood] : 0} vezes</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                    <div key={mood} className="flex items-center gap-2">
                      <span className="text-lg w-7 leading-none">{mood}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${(count / (stats.total || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {stats.topTags.length > 0 && (
              <div className="bg-white dark:bg-[#161622] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm shadow-gray-50 dark:shadow-none">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Tags mais usadas</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.map(({ tag, count }) => (
                    <span key={tag} className="tag-chip text-sm px-3 py-1">
                      #{tag} <span className="opacity-50 ml-1">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* People */}
            {stats.topPeople.length > 0 && (
              <div className="bg-white dark:bg-[#161622] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm shadow-gray-50 dark:shadow-none">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Pessoas mais mencionadas</p>
                <div className="space-y-2.5">
                  {stats.topPeople.map(({ name, count }) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">@{name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-white/8 px-2 py-0.5 rounded-full">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
