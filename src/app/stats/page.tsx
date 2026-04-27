'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import { createClient } from '@/lib/supabase/client';
import { Menu } from 'lucide-react';
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

const MOOD_COLORS: Record<string, string> = {
  '😊': '#9B8FFF', '🥳': '#FF6B9D', '😍': '#FF6B9D', '🤩': '#FFD93D',
  '😌': '#4ECDC4', '🥰': '#FF6B9D', '😂': '#FFD93D', '😢': '#6B9BFF',
  '🥺': '#C49BFF', '😤': '#FF8C6B', '😴': '#A0A0B8', '🤔': '#9B8FFF',
  '😎': '#4ECDC4', '🫶': '#FF6B9D', '🌟': '#FFD93D', '💫': '#C49BFF',
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const { data: allMemories } = await supabase
        .from('memories').select('id, date, mood, is_pinned').eq('user_id', user.id);

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
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));

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
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[200px]">
        {/* Header */}
        <header style={{
          height: '60px', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '0 16px', background: 'var(--bg-base)', borderBottom: '0.5px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 30,
        }} className="lg:px-8">
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

          {/* Desktop: título */}
          <h1 className="hidden lg:block" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Estatísticas
          </h1>

          <div style={{ flex: 1 }} />
          <NotificationBell />
        </header>

        <div className="px-4 lg:px-8 pt-4 pb-24 lg:pb-8" style={{ maxWidth: '720px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* KPIs — linha compacta */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { label: 'Total',    value: stats.total,        sub: 'memórias',    color: 'var(--accent-purple)' },
                  { label: 'Mês',      value: stats.thisMonth,    sub: 'este mês',    color: 'var(--accent-teal)' },
                  { label: 'Sequência',value: stats.streak,       sub: 'dias 🔥',     color: 'var(--accent-amber)' },
                  { label: 'Mood',     value: stats.topMood ?? '—', sub: 'favorito', color: 'var(--accent-pink)' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{
                    borderRadius: '12px', padding: '10px 8px', textAlign: 'center',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: typeof value === 'number' ? '20px' : '22px', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Mood distribution */}
              {Object.keys(stats.moodCounts).length > 0 && (
                <div style={{ borderRadius: '14px', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mood
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([mood, count]) => {
                      const pct = Math.round((count / (stats.total || 1)) * 100);
                      return (
                        <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', width: '20px', flexShrink: 0 }}>{mood}</span>
                          <div style={{ flex: 1, borderRadius: '4px', height: '5px', overflow: 'hidden', background: 'var(--border)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: MOOD_COLORS[mood] ?? 'var(--accent-purple)', transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '26px', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People + Tags — grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">

                {stats.topPeople.length > 0 && (
                  <div style={{ borderRadius: '14px', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', gridColumn: stats.topTags.length === 0 ? '1/-1' : undefined }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pessoas
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stats.topPeople.map(({ name, count }, i) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '12px', flexShrink: 0 }}>{i + 1}</span>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(155,143,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: 700, color: 'var(--accent-purple)',
                          }}>
                            {name[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.topTags.length > 0 && (
                  <div style={{ borderRadius: '14px', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tags
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {stats.topTags.map(({ tag, count }) => (
                        <span key={tag} style={{
                          fontSize: '11px', padding: '3px 8px', borderRadius: '8px',
                          background: 'rgba(155,143,255,0.1)', color: 'var(--accent-purple)',
                          border: '1px solid rgba(155,143,255,0.2)',
                        }}>
                          #{tag}
                          <span style={{ opacity: 0.5, marginLeft: '3px', fontSize: '10px' }}>{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
