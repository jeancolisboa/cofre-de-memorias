'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar, BookOpen, Star, Users, UserCircle2,
  Search, Trash2, ChevronDown, Sun, Moon, LogOut, Settings, X, BarChart2,
} from 'lucide-react';

export type SidebarView = 'calendar' | 'memories' | 'pinned' | 'groups' | 'people' | 'search' | 'trash' | 'settings' | 'stats';

const NAV: { view: SidebarView; label: string; Icon: React.ElementType; color?: string }[] = [
  { view: 'calendar',  label: 'Calendário',    Icon: Calendar,    color: '#818CF8' },
  { view: 'memories',  label: 'Memórias',      Icon: BookOpen,    color: '#9B8FFF' },
  { view: 'pinned',    label: 'Fixadas',        Icon: Star,        color: '#F59E0B' },
  { view: 'groups',    label: 'Grupos',         Icon: Users,       color: '#34D399' },
  { view: 'people',    label: 'Pessoas',        Icon: UserCircle2, color: '#F472B6' },
  { view: 'search',    label: 'Busca',          Icon: Search,      color: '#60A5FA' },
  { view: 'stats',     label: 'Estatísticas',   Icon: BarChart2,   color: '#4ECDC4' },
  { view: 'trash',     label: 'Lixeira',        Icon: Trash2,      color: '#EF4444' },
];

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0]?.toUpperCase() ?? '?' : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function getDisplayName(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0] : `${p[0]} ${p[p.length - 1][0]}.`;
}

interface Props {
  activeView?: SidebarView;
  onViewChange?: (v: SidebarView) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeView, onViewChange, isOpen = false, onClose }: Props) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
      setUserEmail(user.email ?? '');
    });
  }, [supabase]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [menuOpen]);

  // Close sidebar on mobile when navigating
  const handleViewChange = (view: SidebarView) => {
    if (view === 'groups') {
      router.push('/groups');
    } else if (view === 'stats') {
      router.push('/stats');
    } else if (onViewChange) {
      onViewChange(view);
    } else {
      router.push(`/?view=${view}`);
    }
    onClose?.();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const initials = userName ? getInitials(userName) : (userEmail[0]?.toUpperCase() ?? '?');
  const displayName = userName ? getDisplayName(userName) : userEmail.split('@')[0];

  const sidebarContent = (
    <aside style={{
      width: '200px',
      height: '100%',
      background: 'var(--bg-sidebar)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Logo + close button (mobile) */}
      <div style={{ padding: '20px 16px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
        }}>🔒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15 }}>Cofre de</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-purple)', lineHeight: 1.15 }}>Memórias</div>
        </div>
        {/* Close button — only on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center flex-shrink-0"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' }}>
        {NAV.map(({ view, label, Icon, color }) => {
          const active = activeView === view;
          const iconColor = active ? 'var(--accent-purple)' : (color ?? 'var(--text-nav-inactive)');
          return (
            <button
              key={view}
              onClick={() => handleViewChange(view)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px 10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                background: active ? 'rgba(155,143,255,0.12)' : 'transparent',
                color: active ? 'var(--accent-purple)' : 'var(--text-nav-inactive)',
                fontSize: '13px', fontWeight: active ? 500 : 400,
                textAlign: 'left', transition: 'background 120ms, color 120ms',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} style={{ flexShrink: 0, color: iconColor }} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 8px 20px', position: 'relative' }} ref={menuRef}>
        {/* Storage bar */}
        <div style={{ padding: '0 4px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Armazenamento</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>2,4 de 10 GB</span>
          </div>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-pink))', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Popover */}
        {menuOpen && (
          <div style={{
            position: 'absolute', left: '8px', right: '8px', bottom: '100%', marginBottom: '4px',
            borderRadius: '12px', overflow: 'hidden',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.18)',
          }}>
            <button onClick={toggle} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
              padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <div style={{ height: '0.5px', background: 'var(--border)' }} />
            <button onClick={() => { setMenuOpen(false); onViewChange?.('settings'); if (!onViewChange) router.push('/?view=settings'); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
              padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              <Settings size={14} /> Configurações
            </button>
            <div style={{ height: '0.5px', background: 'var(--border)' }} />
            <button onClick={handleLogout} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
              padding: '10px 12px', fontSize: '12px', color: '#EF4444',
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
              <LogOut size={14} /> Sair
            </button>
          </div>
        )}

        {/* Profile */}
        <button onClick={() => setMenuOpen(o => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 8px', borderRadius: '9px', cursor: 'pointer',
          background: menuOpen ? 'rgba(155,143,255,0.08)' : 'transparent',
          border: '1px solid var(--border)',
        }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-purple)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700,
          }}>{initials}</span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName || '…'}
          </span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:block" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40,
        width: '200px',
      }}>
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
          />
          {/* Drawer */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '240px',
            boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
          }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
