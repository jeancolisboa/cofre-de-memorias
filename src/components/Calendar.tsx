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
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  currentMonth: Date;
  memoriesDates: Set<string>;
  pinnedDates?: Set<string>;
  ranges?: Array<{ start: string; end: string; mood?: string | null }>;
  moodMap?: Map<string, string | null>;
  onMonthChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  onRangeSelect?: (start: Date, end: Date) => void;
  memoryCount?: number;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Mapeamento mood → cores visuais
const MOOD_COLORS: Record<string, { bg: string; text: string }> = {
  '😊': { bg: 'rgba(155,143,255,0.18)', text: '#9B8FFF' },
  '🥳': { bg: 'rgba(255,107,157,0.16)', text: '#FF6B9D' },
  '😍': { bg: 'rgba(255,107,157,0.16)', text: '#FF6B9D' },
  '🤩': { bg: 'rgba(255,217,61,0.14)',  text: '#FFD93D' },
  '😌': { bg: 'rgba(78,205,196,0.14)',  text: '#4ECDC4' },
  '🥰': { bg: 'rgba(255,107,157,0.16)', text: '#FF6B9D' },
  '😂': { bg: 'rgba(255,217,61,0.14)',  text: '#FFD93D' },
  '😢': { bg: 'rgba(107,155,255,0.14)', text: '#6B9BFF' },
  '🥺': { bg: 'rgba(196,155,255,0.14)', text: '#C49BFF' },
  '😤': { bg: 'rgba(255,140,107,0.14)', text: '#FF8C6B' },
  '😴': { bg: 'rgba(160,160,184,0.14)', text: '#A0A0B8' },
  '🤔': { bg: 'rgba(155,143,255,0.14)', text: '#9B8FFF' },
  '😎': { bg: 'rgba(78,205,196,0.14)',  text: '#4ECDC4' },
  '🫶': { bg: 'rgba(255,107,157,0.16)', text: '#FF6B9D' },
  '🌟': { bg: 'rgba(255,217,61,0.14)',  text: '#FFD93D' },
  '💫': { bg: 'rgba(196,155,255,0.14)', text: '#C49BFF' },
};

const DEFAULT_MOOD = { bg: 'rgba(155,143,255,0.14)', text: '#9B8FFF' };

function getMoodStyle(mood: string | null | undefined): { bg: string; text: string } {
  if (!mood) return DEFAULT_MOOD;
  return MOOD_COLORS[mood] ?? DEFAULT_MOOD;
}

export default function Calendar({
  currentMonth,
  memoriesDates,
  pinnedDates = new Set(),
  ranges = [],
  moodMap = new Map(),
  onMonthChange,
  onDayPress,
  onRangeSelect,
  memoryCount = 0,
}: CalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handlePrev = useCallback(() => onMonthChange(subMonths(currentMonth, 1)), [currentMonth, onMonthChange]);
  const handleNext = useCallback(() => onMonthChange(addMonths(currentMonth, 1)), [currentMonth, onMonthChange]);

  // Drag — refs for stable closure in global listener, state for re-render
  const isMouseDownRef = useRef(false);
  const dragStartRef = useRef<string | null>(null);
  const dragCurrentRef = useRef<string | null>(null);
  const onDayPressRef = useRef(onDayPress);
  const onRangeSelectRef = useRef(onRangeSelect);
  const [dragRange, setDragRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => { onDayPressRef.current = onDayPress; }, [onDayPress]);
  useEffect(() => { onRangeSelectRef.current = onRangeSelect; }, [onRangeSelect]);

  const applyDrag = useCallback((start: string | null, current: string | null) => {
    dragStartRef.current = start;
    dragCurrentRef.current = current;
    if (start && current) {
      setDragRange({
        start: start <= current ? start : current,
        end:   start <= current ? current : start,
      });
    } else {
      setDragRange(null);
    }
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      const s = dragStartRef.current;
      const c = dragCurrentRef.current;
      if (s && c) {
        if (s !== c) {
          const [a, b] = s <= c ? [s, c] : [c, s];
          onRangeSelectRef.current?.(new Date(a + 'T12:00:00'), new Date(b + 'T12:00:00'));
        } else {
          onDayPressRef.current(new Date(s + 'T12:00:00'));
        }
      }
      applyDrag(null, null);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [applyDrag]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMouseDownRef.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const d = el?.closest('[data-date]')?.getAttribute('data-date');
    if (d) applyDrag(dragStartRef.current, d);
  };

  const handleTouchEnd = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    const s = dragStartRef.current;
    const c = dragCurrentRef.current;
    if (s && c) {
      if (s !== c) {
        const [a, b] = s <= c ? [s, c] : [c, s];
        onRangeSelectRef.current?.(new Date(a + 'T12:00:00'), new Date(b + 'T12:00:00'));
      } else {
        onDayPressRef.current(new Date(s + 'T12:00:00'));
      }
    }
    applyDrag(null, null);
  };

  // Band colors
  const BAND_SAVED = 'color-mix(in srgb, var(--accent-purple) 10%, transparent)';
  const BAND_DRAG  = 'color-mix(in srgb, var(--accent-purple) 20%, transparent)';

  return (
    <div className="w-full select-none">
      {/* Header */}
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
      <div className="flex items-center justify-center gap-4 mb-4 py-2">
        <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-lg active:scale-90" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={18} />
        </button>
        <span className="capitalize" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-lg active:scale-90" style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center py-1 meta-label">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div
        className="grid grid-cols-7"
        style={{ touchAction: dragRange ? 'none' : 'auto' }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hasMemory = memoriesDates.has(dateKey);
          const isPinned = pinnedDates.has(dateKey);
          const inMonth = isSameMonth(day, currentMonth);
          const isT = isToday(day);

          // Saved range position + mood
          let savedPos: 'start' | 'mid' | 'end' | null = null;
          let savedRangeMood: string | null = null;
          for (const r of ranges) {
            if (dateKey === r.start && r.end > r.start) {
              savedPos = 'start';
              savedRangeMood = r.mood ?? null;
              break;
            }
            if (dateKey > r.start && dateKey < r.end) {
              savedPos = 'mid';
              break;
            }
            if (dateKey === r.end && r.end > r.start) {
              savedPos = 'end';
              savedRangeMood = r.mood ?? null;
              break;
            }
          }

          // Drag position
          let dragPos: 'start' | 'mid' | 'end' | 'single' | null = null;
          if (dragRange) {
            const single = dragRange.start === dragRange.end;
            if (dateKey === dragRange.start && dateKey === dragRange.end) dragPos = 'single';
            else if (dateKey === dragRange.start) dragPos = 'start';
            else if (dateKey === dragRange.end)   dragPos = 'end';
            else if (dateKey > dragRange.start && dateKey < dragRange.end) dragPos = 'mid';
            void single;
          }

          const isSavedEndpoint = savedPos === 'start' || savedPos === 'end';
          const isDragEndpoint = dragPos === 'start' || dragPos === 'end' || dragPos === 'single';
          const isMidRange = savedPos === 'mid' || dragPos === 'mid';
          const showCircle = isT || hasMemory || isSavedEndpoint || isDragEndpoint;

          // Determine mood for this day's circle:
          // - regular memory → from moodMap
          // - range endpoint (start: memory on that date; end: from the range object)
          const dayMood = hasMemory
            ? (moodMap.get(dateKey) ?? null)
            : (isSavedEndpoint ? savedRangeMood : null);

          const moodStyle = getMoodStyle(dayMood);

          // Circle background:
          // today → translúcido roxo + ring border (identidade própria)
          // range endpoint → roxo sólido (marcador de seleção forte)
          // drag endpoint → genérico translúcido (mood desconhecido durante drag)
          // memória simples → translúcido por mood
          // tudo mais → transparente
          const circleBg = isT
            ? 'rgba(155,143,255,0.12)'
            : isSavedEndpoint
            ? '#9B8FFF'
            : isDragEndpoint
            ? 'rgba(155,143,255,0.22)'
            : hasMemory
            ? moodStyle.bg
            : 'transparent';

          // Text color:
          // today → roxo
          // range endpoint → escuro (sobre fundo sólido roxo)
          // drag endpoint → branco
          // memória simples → cor do mood
          // mid-range → levemente iluminado
          // vazio → secundário
          const textColor = isT
            ? '#9B8FFF'
            : isSavedEndpoint
            ? '#0D0D0F'
            : isDragEndpoint
            ? 'rgba(255,255,255,0.8)'
            : hasMemory
            ? moodStyle.text
            : isMidRange
            ? '#C4BEFF'
            : 'var(--text-secondary)';

          const fontWeight = isT ? 600 : isSavedEndpoint ? 700 : (hasMemory || isDragEndpoint) ? 500 : 400;

          // Borda especial para "hoje"
          const circleBorder = isT ? '1px solid rgba(155,143,255,0.4)' : 'none';

          // Dot: show for regular memories (not mid-range) and range endpoints
          const hasDot = (hasMemory && !isMidRange) || isSavedEndpoint;
          const dotColor = isT
            ? 'rgba(13,13,15,0.45)'
            : isPinned
            ? 'var(--accent-amber)'
            : moodStyle.text;

          return (
            <div
              key={dateKey}
              data-date={dateKey}
              className="relative h-10 flex items-center justify-center"
              style={{ opacity: inMonth ? 1 : 0.2 }}
              onMouseDown={() => { isMouseDownRef.current = true; applyDrag(dateKey, dateKey); }}
              onMouseEnter={() => { if (isMouseDownRef.current) applyDrag(dragStartRef.current, dateKey); }}
              onTouchStart={() => { isMouseDownRef.current = true; applyDrag(dateKey, dateKey); }}
            >
              {/* Saved range band */}
              {savedPos === 'start' && <div className="absolute inset-y-1 left-1/2 right-0" style={{ background: BAND_SAVED }} />}
              {savedPos === 'mid'   && <div className="absolute inset-y-1 left-0 right-0"   style={{ background: BAND_SAVED }} />}
              {savedPos === 'end'   && <div className="absolute inset-y-1 left-0 right-1/2" style={{ background: BAND_SAVED }} />}

              {/* Drag preview band */}
              {dragPos === 'start' && <div className="absolute inset-y-1 left-1/2 right-0" style={{ background: BAND_DRAG }} />}
              {dragPos === 'mid'   && <div className="absolute inset-y-1 left-0 right-0"   style={{ background: BAND_DRAG }} />}
              {dragPos === 'end'   && <div className="absolute inset-y-1 left-0 right-1/2" style={{ background: BAND_DRAG }} />}

              {/* Day button — circular */}
              <button
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDayPress(day); } }}
                className="relative z-10 flex flex-col items-center justify-center w-9 h-9 cal-day"
                style={{
                  borderRadius: '50%',
                  border: circleBorder,
                  background: showCircle ? circleBg : 'transparent',
                  color: textColor,
                  fontWeight,
                }}
              >
                <span className="text-sm leading-none">{format(day, 'd')}</span>
                {hasDot && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ background: dotColor }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
