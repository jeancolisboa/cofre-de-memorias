'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import GroupCreateSheet from '@/components/GroupCreateSheet';
import { createClient } from '@/lib/supabase/client';
import type { Group } from '@/types';
import { Plus, ChevronRight, Users, Menu } from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('role, group_id, groups(id, name, emoji, created_by, created_at, updated_at)')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map(m => m.group_id);

    const [{ data: memberRows }, { data: memoryRows }] = await Promise.all([
      supabase.from('group_members').select('group_id').in('group_id', groupIds),
      supabase.from('group_memories').select('group_id').in('group_id', groupIds),
    ]);

    const memberCountMap = new Map<string, number>();
    const memoryCountMap = new Map<string, number>();
    memberRows?.forEach(r => memberCountMap.set(r.group_id, (memberCountMap.get(r.group_id) ?? 0) + 1));
    memoryRows?.forEach(r => memoryCountMap.set(r.group_id, (memoryCountMap.get(r.group_id) ?? 0) + 1));

    const result: Group[] = memberships.map(m => ({
      ...(m.groups as unknown as Group),
      my_role: m.role as 'admin' | 'member',
      member_count: memberCountMap.get(m.group_id) ?? 0,
      memory_count: memoryCountMap.get(m.group_id) ?? 0,
    }));

    setGroups(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[200px]">
        {/* Header */}
        <header
          className="px-4 lg:px-8"
          style={{
            height: '60px', display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--bg-base)', borderBottom: '0.5px solid var(--border)',
            position: 'sticky', top: 0, zIndex: 30,
          }}
        >
          {/* Hamburger mobile */}
          <button
            className="lg:hidden"
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

          {/* Título mobile */}
          <span className="lg:hidden" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', flex: 1 }}>
            Meus Grupos
          </span>

          {/* Título desktop */}
          <span className="hidden lg:block" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', flex: 1 }}>
            Meus Grupos
          </span>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <NotificationBell />
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '34px', padding: '0 14px',
                background: 'var(--accent-purple)', border: 'none', borderRadius: '17px',
                color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
              onClick={() => setShowCreate(true)}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">Novo grupo</span>
            </button>
          </div>
        </header>

        <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-10" style={{ maxWidth: '720px' }}>

          {loading && (
            <div className="flex justify-center pt-10">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {!loading && groups.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '80px' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>👥</div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Nenhum grupo ainda
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Crie um grupo para compartilhar memórias com pessoas especiais.
              </p>
              <button className="new-memory-btn" style={{ margin: '0 auto' }} onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                Criar primeiro grupo
              </button>
            </div>
          )}

          <div className="space-y-3">
            {groups.map(group => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group-card"
              >
                <span style={{ fontSize: '40px', lineHeight: 1, flexShrink: 0 }}>{group.emoji}</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={12} style={{ flexShrink: 0 }} />
                    {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                    <span style={{ opacity: 0.4 }}>·</span>
                    {group.memory_count} {group.memory_count === 1 ? 'memória' : 'memórias'}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>

      {showCreate && (
        <GroupCreateSheet
          onClose={() => setShowCreate(false)}
          onCreate={id => { setShowCreate(false); router.push(`/groups/${id}`); }}
        />
      )}
    </div>
  );
}
