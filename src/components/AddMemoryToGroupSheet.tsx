'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Search, Clock, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Memory } from '@/types';

interface Props {
  groupId: string;
  groupName: string;
  existingMemoryIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddMemoryToGroupSheet({ groupId, groupName, existingMemoryIds, onClose, onAdded }: Props) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('memories')
        .select('*, memory_music(*), memory_people(*), memory_tags(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);
      if (data) {
        setMemories(data.map(m => ({
          ...m,
          people: m.memory_people,
          tags: m.memory_tags,
          music_data: m.memory_music?.[0] ?? null,
        })));
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return memories;
    const q = search.toLowerCase();
    return memories.filter(m =>
      m.text.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q) ||
      m.people?.some(p => p.name.toLowerCase().includes(q)) ||
      m.tags?.some(t => t.tag.toLowerCase().includes(q))
    );
  }, [memories, search]);

  const handleAdd = async (memory: Memory) => {
    if (adding) return;
    setAdding(memory.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(null); return; }

    const { error } = await supabase.from('group_memories').insert({
      group_id: groupId,
      memory_id: memory.id,
      added_by: user.id,
    });

    if (!error) {
      // Notifica os outros membros do grupo
      try {
        const { data: otherMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .neq('user_id', user.id);

        if (otherMembers && otherMembers.length > 0) {
          await supabase.from('notifications').insert(
            otherMembers.map(m => ({
              user_id: m.user_id,
              type: 'group_new_memory',
              memory_id: memory.id,
              group_id: groupId,
              from_user_id: user.id,
              meta: { group_name: groupName, memory_title: memory.text.slice(0, 60) },
            }))
          );
        }
      } catch {
        // notificações não bloqueiam o fluxo
      }
      onAdded();
    }
    setAdding(null);
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="memory-sheet" style={{ zIndex: 50 }}>
        <div className="sheet-handle-mobile" />

        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose}><X size={16} /></button>
          <div className="sheet-date-info">
            <span className="sheet-date-label">Adicionar ao grupo</span>
          </div>
          <div style={{ width: 30 }} />
        </div>

        {/* Busca */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar memória..."
              autoFocus
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="sheet-body">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              {search ? 'Nenhuma memória encontrada.' : 'Você não tem memórias ainda.'}
            </div>
          )}

          {!loading && filtered.map(memory => {
            const alreadyAdded = existingMemoryIds.includes(memory.id);
            const isAdding = adding === memory.id;
            return (
              <button
                key={memory.id}
                onClick={() => !alreadyAdded && !isAdding && handleAdd(memory)}
                disabled={alreadyAdded || !!adding}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '14px 20px',
                  minHeight: '64px',
                  background: alreadyAdded ? 'rgba(155,143,255,0.04)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: alreadyAdded ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: alreadyAdded ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{memory.mood ?? '📝'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {memory.text}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {format(new Date(memory.date + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: ptBR })}
                    {memory.location && (
                      <>
                        <MapPin size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memory.location}</span>
                      </>
                    )}
                  </p>
                </div>
                {alreadyAdded && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 600, flexShrink: 0 }}>Já adicionada</span>
                )}
                {isAdding && (
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
          <div style={{ height: '32px' }} />
        </div>
      </div>
    </>
  );
}
