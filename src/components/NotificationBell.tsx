'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NotifItem {
  id: string;
  type: 'memory_tag' | 'group_invite' | 'group_new_memory' | 'on_this_day';
  memory_id: string | null;
  group_id: string | null;
  from_user_id: string | null;
  meta: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  // do join com profiles
  display_name: string | null;
  avatar_url: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'agora';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return format(new Date(dateStr), 'd MMM', { locale: ptBR });
}

function getNotifText(
  type: string,
  displayName: string | null,
  meta: Record<string, unknown> | null,
): string {
  const name  = displayName ?? 'Alguém';
  const title = (meta?.memory_title as string | undefined) ?? 'uma memória';
  const group = (meta?.group_name   as string | undefined) ?? 'um grupo';
  const years = (meta?.years_ago    as number | undefined) ?? 1;

  switch (type) {
    case 'memory_tag':
      return `${name} te marcou em "${title}"`;
    case 'group_invite':
      return `${name} te convidou para o grupo "${group}"`;
    case 'group_new_memory':
      return `${name} adicionou uma memória em "${group}"`;
    case 'on_this_day':
      return `Há ${years} ano${years !== 1 ? 's' : ''}: "${title}"`;
    default:
      return 'Nova notificação';
  }
}

function getInitial(name: string | null): string {
  return ((name ?? '?')[0]).toUpperCase();
}

// ── Enrich notifications with profile data ────────────────────────────────

async function enrichWithProfiles(
  rows: Omit<NotifItem, 'display_name' | 'avatar_url'>[],
  supabase: ReturnType<typeof createClient>,
): Promise<NotifItem[]> {
  const ids = Array.from(new Set(rows.map((r) => r.from_user_id).filter(Boolean))) as string[];
  const { data: profiles } = ids.length > 0
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids)
    : { data: [] };

  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    display_name: r.from_user_id ? (map.get(r.from_user_id)?.display_name ?? null) : null,
    avatar_url:   r.from_user_id ? (map.get(r.from_user_id)?.avatar_url   ?? null) : null,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen]             = useState(false);
  const [notifs, setNotifs]         = useState<NotifItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const bellRef  = useRef<HTMLDivElement>(null);
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const unreadCount = notifs.filter((n) => !n.read_at).length;
  const badgeLabel  = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: rows } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!rows) { setLoading(false); return; }
    setNotifs(await enrichWithProfiles(rows, supabase));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // ── Realtime ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    // Sufixo único por invocação evita colisão de nomes em Strict Mode
    const channelKey = Math.random().toString(36).slice(2);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return;

      channelRef = supabase
        .channel(`notif-bell:${user.id}:${channelKey}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            if (!mounted) return;
            const row = payload.new as Omit<NotifItem, 'display_name' | 'avatar_url'>;
            const [enriched] = await enrichWithProfiles([row], supabase);
            setNotifs((prev) => [enriched, ...prev].slice(0, 20));
          },
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [supabase]);

  // ── Close on Escape ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleOpen = () => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  const markRead = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    setNotifs((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
  }, [supabase]);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    const now = new Date().toISOString();
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
  }, [supabase]);

  const handleNotifClick = useCallback(async (notif: NotifItem) => {
    if (!notif.read_at) await markRead(notif.id);
    setOpen(false);
    if (notif.memory_id) {
      router.push(`/?memory=${notif.memory_id}`);
    }
  }, [markRead, router]);

  const handleAccept = useCallback(async (notif: NotifItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (notif.type === 'memory_tag' && notif.memory_id) {
      await supabase.from('memory_members').upsert({
        memory_id: notif.memory_id,
        user_id: user.id,
        role: 'viewer',
        invited_by: notif.from_user_id,
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'memory_id,user_id' });
    } else if (notif.type === 'group_invite' && notif.group_id) {
      await supabase.from('group_members').upsert({
        group_id: notif.group_id,
        user_id: user.id,
        role: 'member',
      }, { onConflict: 'group_id,user_id' });
    }

    await markRead(notif.id);
  }, [supabase, markRead]);

  const handleReject = useCallback(async (notif: NotifItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (notif.type === 'memory_tag' && notif.memory_id) {
      await Promise.all([
        supabase.from('memory_people').delete()
          .eq('memory_id', notif.memory_id).eq('user_id', user.id),
        supabase.from('memory_members').delete()
          .eq('memory_id', notif.memory_id).eq('user_id', user.id),
      ]);
    }
    // group_invite: apenas descarta a notificação

    await markRead(notif.id);
    setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
  }, [supabase, markRead]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Bell button — fica no header */}
      <div ref={bellRef}>
        <button
          onClick={handleOpen}
          className="w-9 h-9 flex items-center justify-center rounded-full relative"
          style={{
            background: open ? 'color-mix(in srgb, var(--accent-purple) 12%, transparent)' : 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: open ? 'var(--accent-purple)' : 'var(--text-secondary)',
          }}
          title="Notificações"
        >
          <Bell size={20} strokeWidth={1.5} />
          {badgeLabel && (
            <span className="notif-badge">{badgeLabel}</span>
          )}
        </button>
      </div>

      {/* Overlay para fechar ao clicar fora */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Dropdown — ancorado abaixo do sino, alinhado à direita */}
      {open && (
        <div
          className="notif-dropdown"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {/* Header */}
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Notificações</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="notif-list">
            {loading && (
              <div className="notif-empty">
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
                />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="notif-empty">
                <Bell size={24} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <span className="notif-empty-text">Nada por aqui ainda</span>
              </div>
            )}

            {!loading && notifs.slice(0, 5).map((notif) => {
              const isPendingAction = !notif.read_at && (notif.type === 'memory_tag' || notif.type === 'group_invite');
              return isPendingAction ? (
                <div
                  key={notif.id}
                  className="notif-item notif-item--unread"
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}
                >
                  <span className="notif-unread-dot" />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div className="notif-avatar">
                      {notif.avatar_url
                        ? <img src={notif.avatar_url} alt="" className="notif-avatar-img" referrerPolicy="no-referrer" />
                        : <span>{getInitial(notif.display_name)}</span>
                      }
                    </div>
                    <div className="notif-content">
                      <p className="notif-text">
                        {getNotifText(notif.type, notif.display_name, notif.meta)}
                      </p>
                      <span className="notif-time">{timeAgo(notif.created_at)}</span>
                    </div>
                  </div>
                  <div className="notif-actions">
                    <button
                      className="notif-action-btn notif-action-btn--accept"
                      onClick={() => handleAccept(notif)}
                    >
                      {notif.type === 'group_invite' ? '✓ Entrar' : '✓ Aceitar'}
                    </button>
                    <button
                      className="notif-action-btn notif-action-btn--reject"
                      onClick={() => handleReject(notif)}
                    >
                      ✕ Recusar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={notif.id}
                  className={`notif-item${!notif.read_at ? ' notif-item--unread' : ''}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  {!notif.read_at && <span className="notif-unread-dot" />}
                  <div className="notif-avatar">
                    {notif.avatar_url
                      ? <img src={notif.avatar_url} alt="" className="notif-avatar-img" referrerPolicy="no-referrer" />
                      : <span>{getInitial(notif.display_name)}</span>
                    }
                  </div>
                  <div className="notif-content">
                    <p className="notif-text">
                      {getNotifText(notif.type, notif.display_name, notif.meta)}
                    </p>
                    <span className="notif-time">{timeAgo(notif.created_at)}</span>
                  </div>
                </button>
              );
            })}

            {/* Ver todas */}
            {!loading && notifs.length > 5 && (
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: '100%', padding: '10px', fontSize: '12px', fontWeight: 500,
                  color: 'var(--accent-purple)', background: 'none', border: 'none',
                  borderTop: '0.5px solid var(--border)', cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Ver todas ({notifs.length})
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
