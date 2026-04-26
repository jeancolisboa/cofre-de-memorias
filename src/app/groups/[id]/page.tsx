'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import MemoryModal from '@/components/MemoryModal';
import GroupConfigSheet from '@/components/GroupConfigSheet';
import AddMemoryToGroupSheet from '@/components/AddMemoryToGroupSheet';
import InviteMemberSheet from '@/components/InviteMemberSheet';
import { createClient } from '@/lib/supabase/client';
import type { Group, GroupMember, GroupMemoryItem, MemoryFormData } from '@/types';
import { ChevronLeft, Settings, Plus, Clock, MapPin, Star, X } from 'lucide-react';

type Tab = 'memories' | 'members';

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<Group | null>(null);
  const [myRole, setMyRole] = useState<'admin' | 'member' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupMemories, setGroupMemories] = useState<GroupMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('memories');

  const [selectedGM, setSelectedGM] = useState<GroupMemoryItem | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const fetchGroupData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUserId(user.id);

    // 1. Dados do grupo
    const { data: groupData, error: groupError } = await supabase
      .from('groups').select('*').eq('id', id).single();
    if (groupError || !groupData) { router.push('/groups'); return; }

    // 2. Minha participação
    const { data: myMembership } = await supabase
      .from('group_members').select('role')
      .eq('group_id', id).eq('user_id', user.id).single();
    if (!myMembership) { router.push('/groups'); return; }

    setGroup(groupData as Group);
    setMyRole(myMembership.role as 'admin' | 'member');

    // 3. Todos os membros + perfis
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at')
      .eq('group_id', id)
      .order('role', { ascending: true })   // admin < member alfabeticamente
      .order('joined_at', { ascending: true });

    if (memberRows) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      setMembers(memberRows.map(m => ({
        user_id: m.user_id,
        role: m.role as 'admin' | 'member',
        joined_at: m.joined_at ?? new Date().toISOString(),
        display_name: profileMap.get(m.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
        email: profileMap.get(m.user_id)?.email ?? null,
      })));
    }

    // 4. Memórias do grupo
    const { data: gmRows } = await supabase
      .from('group_memories')
      .select('id, memory_id, posted_by, posted_at')
      .eq('group_id', id)
      .order('posted_at', { ascending: false });

    if (gmRows && gmRows.length > 0) {
      const memoryIds = gmRows.map(r => r.memory_id);
      const postedByIds = Array.from(new Set(gmRows.map(r => r.posted_by)));

      const [{ data: memData }, { data: posterProfiles }] = await Promise.all([
        supabase.from('memories')
          .select('*, memory_music(*), memory_people(*), memory_tags(*)')
          .in('id', memoryIds),
        supabase.from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', postedByIds),
      ]);

      const memMap = new Map((memData ?? []).map(m => [m.id, m]));
      const posterMap = new Map((posterProfiles ?? []).map(p => [p.id, p]));

      const gms: GroupMemoryItem[] = gmRows
        .map(gm => {
          const rawMem = memMap.get(gm.memory_id);
          if (!rawMem) return null;
          const poster = posterMap.get(gm.posted_by);
          return {
            id: gm.id,
            memory_id: gm.memory_id,
            posted_by: gm.posted_by,
            posted_at: gm.posted_at,
            memory: {
              ...rawMem,
              people: rawMem.memory_people,
              tags: rawMem.memory_tags,
              music_data: rawMem.memory_music?.[0] ?? null,
            },
            poster_name: poster?.display_name ?? null,
            poster_avatar: poster?.avatar_url ?? null,
          } as GroupMemoryItem;
        })
        .filter((gm): gm is GroupMemoryItem => gm !== null);

      setGroupMemories(gms);
    } else {
      setGroupMemories([]);
    }

    setLoading(false);
  }, [id, supabase, router]);

  useEffect(() => { fetchGroupData(); }, [fetchGroupData]);

  const existingMemoryIds = useMemo(() => groupMemories.map(gm => gm.memory_id), [groupMemories]);
  const memberIds = useMemo(() => members.map(m => m.user_id), [members]);

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(null);
    await supabase.from('group_members').delete()
      .eq('group_id', id).eq('user_id', memberId);
    setMembers(prev => prev.filter(m => m.user_id !== memberId));
  };

  // Save da memória (só o dono consegue realmente salvar)
  const handleMemorySave = useCallback(async (formData: MemoryFormData) => {
    if (!selectedGM || !userId) return;
    const mem = selectedGM.memory;
    if (mem.user_id !== userId) return;

    const { error } = await supabase.from('memories').update({
      text: formData.text, mood: formData.mood,
      music: formData.music || null, location: formData.location || null,
      is_pinned: formData.is_pinned, end_date: formData.end_date || null,
      updated_at: new Date().toISOString(),
    }).eq('id', mem.id);
    if (error) return;

    await supabase.from('memory_music').delete().eq('memory_id', mem.id);
    if (formData.music?.trim()) {
      const parts = formData.music.split(' - ');
      await supabase.from('memory_music').insert({
        memory_id: mem.id,
        title: parts[0]?.trim() || formData.music,
        artist: parts[1]?.trim() || null,
      });
    }
    await supabase.from('memory_people').delete().eq('memory_id', mem.id);
    if (formData.people.length > 0)
      await supabase.from('memory_people').insert(
        formData.people.map(p => ({ memory_id: mem.id, name: p.name, user_id: p.user_id }))
      );
    await supabase.from('memory_tags').delete().eq('memory_id', mem.id);
    if (formData.tags.length > 0)
      await supabase.from('memory_tags').insert(
        formData.tags.map(tag => ({ memory_id: mem.id, tag }))
      );

    await fetchGroupData();
  }, [selectedGM, userId, supabase, fetchGroupData]);

  const handleMemoryDelete = useCallback(async () => {
    if (!selectedGM || !userId) return;
    if (selectedGM.memory.user_id !== userId) return;
    await supabase.from('memories').delete().eq('id', selectedGM.memory.id);
    await fetchGroupData();
  }, [selectedGM, userId, supabase, fetchGroupData]);

  function getInitial(name: string | null): string {
    return ((name ?? '?')[0]).toUpperCase();
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!group || !myRole) return null;

  const isAdmin = myRole === 'admin';

  return (
    <div className="flex" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />

      <main className="flex-1 lg:ml-[220px]">
        {/* Header */}
        <header
          className="sticky top-0 z-30"
          style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 px-4 lg:px-6 pt-14 lg:pt-0 py-3">
            <button
              onClick={() => router.push('/groups')}
              className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={18} />
            </button>

            <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>{group.emoji}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, margin: 0 }}>
                {group.name}
              </h1>
              <span style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '20px',
                marginTop: '3px',
                background: isAdmin ? 'rgba(155,143,255,0.12)' : 'rgba(255,255,255,0.06)',
                color: isAdmin ? 'var(--accent-purple)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {isAdmin ? 'Admin' : 'Membro'}
              </span>
            </div>

            <button
              onClick={() => setShowConfig(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              title="Configurações"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex' }}>
            {(['memories', 'members'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  fontSize: '13px',
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? 'var(--accent-purple)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${tab === t ? 'var(--accent-purple)' : 'transparent'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'memories' ? 'Memórias' : 'Membros'}
              </button>
            ))}
          </div>
        </header>

        {/* ── Aba Memórias ── */}
        {tab === 'memories' && (
          <div className="pb-28 lg:pb-10 relative" style={{ maxWidth: '720px' }}>
            {groupMemories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Nenhuma memória neste grupo ainda.
              </div>
            )}

            {groupMemories.map(gm => (
              <button
                key={gm.id}
                onClick={() => setSelectedGM(gm)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: '26px', flexShrink: 0 }}>{gm.memory.mood ?? '📝'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {gm.memory.text}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 1px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <Clock size={11} />
                    {format(new Date(gm.memory.date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR })}
                    {gm.memory.location && (<><MapPin size={11} /><span>{gm.memory.location}</span></>)}
                    {gm.memory.is_pinned && <Star size={11} style={{ color: 'var(--accent-amber)', fill: 'var(--accent-amber)' }} />}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                    Postado por {gm.poster_name ?? 'alguém'} · {format(new Date(gm.posted_at), "d MMM", { locale: ptBR })}
                  </p>
                </div>
              </button>
            ))}

            {/* FAB mobile */}
            <button onClick={() => setShowAddMemory(true)} className="group-fab lg:hidden">
              <Plus size={24} strokeWidth={2.5} />
            </button>

            {/* Botão desktop */}
            <div className="hidden lg:flex" style={{ padding: '16px 20px' }}>
              <button className="new-memory-btn" onClick={() => setShowAddMemory(true)}>
                <Plus size={14} />
                Adicionar memória
              </button>
            </div>
          </div>
        )}

        {/* ── Aba Membros ── */}
        {tab === 'members' && (
          <div className="pb-28 lg:pb-10" style={{ maxWidth: '720px' }}>
            {members.map(member => (
              <div
                key={member.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  minHeight: '64px',
                }}
              >
                {removingMember === member.user_id ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Remover <strong>{member.display_name ?? member.email}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setRemovingMember(null)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
                      >Não</button>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}
                      >Remover</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(155,143,255,0.18)', color: 'var(--accent-purple)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 600, flexShrink: 0, overflow: 'hidden',
                    }}>
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        : getInitial(member.display_name)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {member.display_name ?? member.email}
                          {member.user_id === userId && (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}> (você)</span>
                          )}
                        </p>
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          padding: '2px 7px', borderRadius: '20px',
                          background: member.role === 'admin' ? 'rgba(155,143,255,0.12)' : 'rgba(255,255,255,0.05)',
                          color: member.role === 'admin' ? 'var(--accent-purple)' : 'var(--text-muted)',
                          textTransform: 'uppercase', flexShrink: 0,
                        }}>
                          {member.role === 'admin' ? 'Admin' : 'Membro'}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        desde {format(new Date(member.joined_at), "MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Remover: admin pode remover membros não-admin que não são ele mesmo */}
                    {isAdmin && member.user_id !== userId && member.role !== 'admin' && (
                      <button
                        onClick={() => setRemovingMember(member.user_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                        title="Remover membro"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {isAdmin && (
              <div style={{ padding: '16px 20px' }}>
                <button className="new-memory-btn" onClick={() => setShowInvite(true)}>
                  <Plus size={14} />
                  Convidar membro
                </button>
              </div>
            )}
          </div>
        )}

        <BottomNav />
      </main>

      {/* Sheets */}
      {showConfig && userId && (
        <GroupConfigSheet
          group={group}
          myRole={myRole}
          userId={userId}
          onClose={() => setShowConfig(false)}
          onUpdated={updated => { setGroup(updated); setShowConfig(false); }}
          onLeft={() => router.push('/groups')}
          onDeleted={() => router.push('/groups')}
        />
      )}

      {showAddMemory && (
        <AddMemoryToGroupSheet
          groupId={id}
          groupName={group.name}
          existingMemoryIds={existingMemoryIds}
          onClose={() => setShowAddMemory(false)}
          onAdded={() => { setShowAddMemory(false); fetchGroupData(); }}
        />
      )}

      {showInvite && (
        <InviteMemberSheet
          groupId={id}
          groupName={group.name}
          groupEmoji={group.emoji}
          existingMemberIds={memberIds}
          onClose={() => setShowInvite(false)}
          onInvited={() => setShowInvite(false)}
        />
      )}

      {selectedGM && (
        <MemoryModal
          date={new Date(selectedGM.memory.date + 'T12:00:00')}
          memory={selectedGM.memory}
          onClose={() => setSelectedGM(null)}
          onSave={handleMemorySave}
          onDelete={selectedGM.memory.user_id === userId ? handleMemoryDelete : undefined}
        />
      )}
    </div>
  );
}
