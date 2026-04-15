'use client';

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCallback } from 'react';

interface CalendarProps {
  currentMonth: Date;
  memoriesDates: Set<string>;
  pinnedDates?: Set<string>;
  onMonthChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  memoryCount?: number;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Calendar({
  currentMonth,
  memoriesDates,
  pinnedDates = new Set(),
  onMonthChange,
  onDayPress,
  memoryCount = 0,
}: CalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handlePrev = useCallback(() => onMonthChange(subMonths(currentMonth, 1)), [currentMonth, onMonthChange]);
  const handleNext = useCallback(() => onMonthChange(addMonths(currentMonth, 1)), [currentMonth, onMonthChange]);

  return (
    <div className="w-full select-none">
      {/* Header — month name left, count right */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div>
          <span className="capitalize" style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {format(currentMonth, 'MMMM', { locale: ptBR })}
          </span>
          <span className="ml-2" style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-muted)' }}>
            {format(currentMonth, 'yyyy')}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {memoryCount} {memoryCount === 1 ? 'memória' : 'memórias'}
        </span>
      </div>

      {/* Month navigation */}
      <div
        className="flex items-center justify-center gap-4 mb-4 rounded-xl py-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={handlePrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg active:scale-90"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="capitalize" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={handleNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg active:scale-90"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center py-1 meta-label">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hasMemory = memoriesDates.has(dateKey);
          const isPinned = pinnedDates.has(dateKey);
          const inMonth = isSameMonth(day, currentMonth);
          const isT = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onDayPress(day)}
              className={['cal-day relative flex flex-col items-center justify-center h-10 mx-0.5', !inMonth ? 'opacity-20' : ''].join(' ')}
              style={{
                borderRadius: '8px',
                ...(isT
                  ? { background: 'var(--accent-purple)', color: '#FFFFFF', fontWeight: 600 }
                  : hasMemory
                  ? { background: 'color-mix(in srgb, var(--accent-purple) 12%, transparent)', color: 'var(--accent-purple)', fontWeight: 500 }
                  : { color: 'var(--text-secondary)' }),
                ...(isT ? {} : { border: isT ? `1px solid var(--accent-purple)` : undefined }),
              }}
            >
              <span className="text-sm leading-none">{format(day, 'd')}</span>
              {hasMemory && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{
                    background: isT
                      ? 'rgba(255,255,255,0.7)'
                      : isPinned
                      ? 'var(--accent-amber)'
                      : 'var(--accent-purple)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
