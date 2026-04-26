'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface Props {
  groupId: string;
  groupName: string;
  groupEmoji: string;
  existingMemberIds: string[];
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberSheet({ groupId, groupName, groupEmoji, existingMemberIds, onClose, onInvited }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const searchProfiles = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, email')
      .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
      .neq('id', user?.id ?? '')
      .limit(8);
    setResults(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProfiles(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchProfiles]);

  const handleInvite = async (profile: Profile) => {
    if (inviting) return;
    setInviting(profile.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInviting(null); return; }

    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'group_invite',
      group_id: groupId,
      from_user_id: user.id,
      meta: { group_name: groupName, group_emoji: groupEmoji },
    });

    setInvitedIds(prev => [...prev, profile.id]);
    setInviting(null);
    onInvited();
  };

  function getInitial(name: string | null): string {
    return ((name ?? '?')[0]).toUpperCase();
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="memory-sheet" style={{ zIndex: 50 }}>
        <div className="sheet-handle-mobile" />

        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose}><X size={16} /></button>
          <div className="sheet-date-info">
            <span className="sheet-date-label">Convidar membro</span>
          </div>
          <div style={{ width: 30 }} />
        </div>

        {/* Busca */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              autoFocus
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div className="sheet-body">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhum usuário encontrado.
            </div>
          )}

          {!loading && query.length < 2 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Digite pelo menos 2 caracteres para buscar.
            </div>
          )}

          {results.map(profile => {
            const isExisting = existingMemberIds.includes(profile.id);
            const isInvited = invitedIds.includes(profile.id);
            const isDisabled = isExisting || isInvited;
            return (
              <button
                key={profile.id}
                onClick={() => !isDisabled && handleInvite(profile)}
                disabled={isDisabled || inviting === profile.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '14px 20px',
                  minHeight: '64px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: isDisabled ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(155,143,255,0.2)', color: 'var(--accent-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 600, flexShrink: 0, overflow: 'hidden',
                }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : getInitial(profile.display_name)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.display_name ?? profile.email}
                  </p>
                  {profile.display_name && profile.email && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.email}
                    </p>
                  )}
                </div>
                {isExisting && <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>Já é membro</span>}
                {isInvited && <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 600, flexShrink: 0 }}>Convidado ✓</span>}
                {!isDisabled && inviting !== profile.id && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-purple)', flexShrink: 0 }}>Convidar</span>
                )}
                {inviting === profile.id && (
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
