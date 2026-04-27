'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Calendar, BookOpen, Star, UserCircle2, Plus } from 'lucide-react';

const TABS = [
  { label: 'Calendário', Icon: Calendar,    href: '/',              view: null    },
  { label: 'Memórias',   Icon: BookOpen,    href: '/?view=memories', view: 'memories' },
  { label: 'Fixadas',    Icon: Star,        href: '/?view=pinned',  view: 'pinned' },
  { label: 'Perfil',     Icon: UserCircle2, href: '/?view=settings', view: 'settings' },
];

export default function BottomNav() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const currentView  = searchParams.get('view');

  function isActive(tab: typeof TABS[number]) {
    if (tab.view) return pathname === '/' && currentView === tab.view;
    return pathname === '/' && !currentView;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        height: '60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', position: 'relative' }}>

        {/* Tabs esquerda */}
        {TABS.slice(0, 2).map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
            >
              <tab.Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? 'var(--accent-purple)' : 'var(--text-muted)' }}
              />
              <span style={{ fontSize: '9px', color: active ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Botão + central */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/?new=1')}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'var(--accent-purple)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(155,143,255,0.45)',
              marginBottom: '4px',
            }}
          >
            <Plus size={22} strokeWidth={2.5} style={{ color: '#fff' }} />
          </button>
        </div>

        {/* Tabs direita */}
        {TABS.slice(2).map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
            >
              <tab.Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                fill={active && tab.label === 'Fixadas' ? 'currentColor' : 'none'}
                style={{ color: active ? 'var(--accent-purple)' : 'var(--text-muted)' }}
              />
              <span style={{ fontSize: '9px', color: active ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                {tab.label}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
