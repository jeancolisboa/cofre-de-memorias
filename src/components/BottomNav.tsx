'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Star, Search, BarChart2 } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Calendário', Icon: Calendar },
  { href: '/pinned', label: 'Fixadas', Icon: Star },
  { href: '/search', label: 'Busca', Icon: Search },
  { href: '/stats', label: 'Stats', Icon: BarChart2 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        height: '56px',
      }}
    >
      <div className="flex items-stretch h-full pb-safe">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center flex-1 gap-1"
            >
              <tab.Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                fill={isActive && tab.href === '/pinned' ? 'currentColor' : 'none'}
                style={{ color: isActive ? 'var(--accent-purple)' : 'var(--text-muted)' }}
              />
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: 'var(--accent-purple)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
