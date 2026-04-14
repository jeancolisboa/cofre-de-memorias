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
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Calendar({
  currentMonth,
  memoriesDates,
  pinnedDates = new Set(),
  onMonthChange,
  onDayPress,
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
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <button
          onClick={handlePrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {format(currentMonth, 'MMMM', { locale: ptBR })}
          </span>
          <span className="text-base font-normal text-gray-400 ml-1.5">
            {format(currentMonth, 'yyyy')}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid — h-10 fixed height prevents overflow/cut */}
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
              className={[
                'cal-day relative flex flex-col items-center justify-center h-10 rounded-xl mx-0.5',
                !inMonth ? 'opacity-20' : '',
                isT
                  ? 'bg-violet-600 text-white font-semibold shadow-sm shadow-violet-400/30'
                  : hasMemory
                  ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5',
              ].join(' ')}
            >
              <span className="text-sm leading-none">{format(day, 'd')}</span>
              {hasMemory && (
                <span
                  className={[
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    isT
                      ? 'bg-white/70'
                      : isPinned
                      ? 'bg-amber-400'
                      : 'bg-violet-400 dark:bg-violet-500',
                  ].join(' ')}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
