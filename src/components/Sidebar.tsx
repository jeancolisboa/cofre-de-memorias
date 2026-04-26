'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Star, Search, BarChart2, ChevronDown, Sun, Moon, LogOut } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const TABS = [
  { href: '/', label: 'Calendário', Icon: Calendar },
  { href: '/pinned', label: 'Fixadas', Icon: Star },
  { href: '/search', label: 'Busca', Icon: Search },
  { href: '/stats', label: 'Estatísticas', Icon: BarChart2 },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function Sidebar() {
  const pathname = usePathname();
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
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
      setUserName(name);
      setUserEmail(user.email ?? '');
    });
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = userName ? getInitials(userName) : (userEmail[0]?.toUpperCase() ?? '?');
  const displayName = userName ? getDisplayName(userName) : userEmail.split('@')[0];

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{ width: '220px', background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-8 pb-6">
        <span className="meta-label">Cofre de Memórias</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-3 py-2.5 rounded-xl relative"
              style={{
                paddingLeft: '20px',
                paddingRight: '12px',
                color: isActive ? 'var(--accent-purple)' : 'var(--text-nav-inactive)',
                background: 'transparent',
              }}
            >
              {isActive && (
                <span
                  className="absolute rounded-r-sm"
                  style={{
                    left: 0,
                    top: '8px',
                    bottom: '8px',
                    width: '3px',
                    background: 'var(--accent-purple)',
                  }}
                />
              )}
              <tab.Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                fill={isActive && tab.href === '/pinned' ? 'currentColor' : 'none'}
                className="flex-shrink-0"
              />
              <span style={{ fontSize: '14px', fontWeight: isActive ? 500 : 400 }}>{tab.label}</span>
            </Link>
          );
        })}

        {/* Sino de notificações — abaixo de Estatísticas */}
        <NotificationBell />
      </nav>

      {/* User profile */}
      <div className="px-3 pb-6 relative" ref={menuRef}>
        {/* Popover — opens above */}
        {menuOpen && (
          <div
            className="absolute left-3 right-3 bottom-full mb-2 rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 -4px 16px rgba(0,0,0,0.15)' }}
          >
            <button
              onClick={() => { toggle(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="flex-shrink-0" />
              ) : (
                <Moon size={16} className="flex-shrink-0" />
              )}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm"
              style={{ color: '#EF4444' }}
            >
              <LogOut size={16} className="flex-shrink-0" />
              Sair
            </button>
          </div>
        )}

        {/* Profile button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{
            background: menuOpen ? 'color-mix(in srgb, var(--text-muted) 10%, transparent)' : 'transparent',
            border: '1px solid var(--border)',
          }}
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
            style={{ background: 'var(--accent-purple)', color: '#0D0D0F' }}
          >
            {initials}
          </span>
          <span className="flex-1 text-left truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {displayName || '…'}
          </span>
          <ChevronDown
            size={14}
            className="flex-shrink-0"
            style={{
              color: 'var(--text-muted)',
              transform: menuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      </div>
    </aside>
  );
}
