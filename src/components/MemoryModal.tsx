'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Memory, MemoryFormData, Mood } from '@/types';

const MOODS: Mood[] = ['😊', '😢', '😡', '😍', '😴', '🤩', '😌', '😰', '🥳', '🤔'];

interface MemoryModalProps {
  date: Date;
  memory?: Memory | null;
  onClose: () => void;
  onSave: (data: MemoryFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function MemoryModal({ date, memory, onClose, onSave, onDelete }: MemoryModalProps) {
  const [text, setText] = useState(memory?.text ?? '');
  const [mood, setMood] = useState<Mood | null>(memory?.mood ?? null);
  const [music, setMusic] = useState(
    memory?.music_data
      ? `${memory.music_data.title}${memory.music_data.artist ? ` - ${memory.music_data.artist}` : ''}`
      : memory?.music ?? ''
  );
  const [location, setLocation] = useState(memory?.location ?? '');
  const [isPinned, setIsPinned] = useState(memory?.is_pinned ?? false);
  const [personInput, setPersonInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [people, setPeople] = useState<string[]>(memory?.people?.map((p) => p.name) ?? []);
  const [tags, setTags] = useState<string[]>(memory?.tags?.map((t) => t.tag) ?? []);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => textRef.current?.focus(), 320);
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [text, autoResize]);

  const addPerson = () => {
    const name = personInput.trim().replace(/^@/, '');
    if (name && !people.includes(name)) setPeople((p) => [...p, name]);
    setPersonInput('');
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag]);
    setTagInput('');
  };

  const handlePersonKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPerson(); }
    if (e.key === 'Backspace' && personInput === '') setPeople((p) => p.slice(0, -1));
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && tagInput === '') setTags((t) => t.slice(0, -1));
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave({ text, mood, music, location, people, tags, is_pinned: isPinned });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try { await onDelete(); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex-1 flex flex-col mt-12 rounded-t-3xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--bg-card)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-2 pb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <p className="capitalize" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {format(date, 'EEEE', { locale: ptBR })}
            </p>
            <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPinned((p) => !p)}
              className="p-2 rounded-full"
              style={{ color: isPinned ? 'var(--accent-amber)' : 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--accent-purple)', color: '#0D0D0F' }}
            >
              {saving ? '…' : memory ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-3">

          {/* Text — auto-resize, underline style */}
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autoResize(); }}
            placeholder="o que aconteceu hoje?"
            className="w-full bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              fontSize: '15px',
              lineHeight: 1.7,
              minHeight: '120px',
              resize: 'none',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '12px',
            }}
          />

          {/* Mood */}
          <div>
            <p className="meta-label mb-2">Mood</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? null : m)}
                  className="w-10 h-10 text-xl rounded-2xl active:scale-90"
                  style={{
                    background: mood === m
                      ? 'color-mix(in srgb, var(--accent-purple) 20%, transparent)'
                      : 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
                    outline: mood === m ? '2px solid var(--accent-purple)' : 'none',
                    transform: mood === m ? 'scale(1.1)' : undefined,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Music */}
          <Field icon="🎵">
            <input
              type="text"
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder="Artista - Nome da música"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-primary)' }}
            />
          </Field>

          {/* Location */}
          <Field icon="📍">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Onde você estava?"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-primary)' }}
            />
          </Field>

          {/* People — grows only if chips present */}
          <ChipField icon="👥" hasChips={people.length > 0}>
            {people.map((p) => (
              <span key={p} className="tag-chip flex-shrink-0">
                @{p}
                <button onClick={() => setPeople((prev) => prev.filter((x) => x !== p))} className="opacity-50 hover:opacity-100 leading-none">×</button>
              </span>
            ))}
            <input
              type="text"
              value={personInput}
              onChange={(e) => setPersonInput(e.target.value)}
              onKeyDown={handlePersonKey}
              onBlur={addPerson}
              placeholder={people.length === 0 ? '@pessoa' : ''}
              className="bg-transparent outline-none"
              style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-primary)', minWidth: '70px', flex: 1 }}
            />
          </ChipField>

          {/* Tags — grows only if chips present */}
          <ChipField icon="#" hasChips={tags.length > 0}>
            {tags.map((t) => (
              <span key={t} className="tag-chip flex-shrink-0">
                #{t}
                <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="opacity-50 hover:opacity-100 leading-none">×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={addTag}
              placeholder={tags.length === 0 ? '#tag' : ''}
              className="bg-transparent outline-none"
              style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-primary)', minWidth: '60px', flex: 1 }}
            />
          </ChipField>

          {/* Delete */}
          {memory && onDelete && (
            <div className="pt-2 pb-10">
              {showDeleteConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-medium"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                  >
                    Confirmar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-2xl text-sm"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  Excluir memória
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Single-line field (fixed height 44px, vertically centered)
function Field({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] px-3.5"
      style={{
        height: '44px',
        background: 'color-mix(in srgb, var(--text-muted) 8%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="flex-shrink-0"
        style={{ fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)' }}
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

// Chip field — 44px by default, grows vertically when chips are present
function ChipField({ icon, hasChips, children }: { icon: string; hasChips: boolean; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center flex-wrap gap-1.5 rounded-[10px] px-3.5"
      style={{
        minHeight: '44px',
        padding: hasChips ? '8px 14px' : '0 14px',
        background: 'color-mix(in srgb, var(--text-muted) 8%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="flex-shrink-0"
        style={{ fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)' }}
      >
        {icon}
      </span>
      {children}
    </div>
  );
}
