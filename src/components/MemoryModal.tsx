'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
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

  useEffect(() => {
    setTimeout(() => textRef.current?.focus(), 320);
  }, []);

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
      className="fixed inset-0 z-50 flex flex-col bg-black/40 dark:bg-black/60 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex-1 flex flex-col mt-12 bg-white dark:bg-[#141420] rounded-t-3xl animate-slide-up overflow-hidden shadow-2xl">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-gray-100 dark:border-white/8">
          <button onClick={onClose} className="p-2 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-400 capitalize">{format(date, 'EEEE', { locale: ptBR })}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPinned((p) => !p)}
              className={`p-2 rounded-full transition-colors ${isPinned ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}
            >
              <svg className="w-5 h-5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold rounded-full transition-colors"
            >
              {saving ? '…' : memory ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-4">
          {/* Text */}
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que aconteceu hoje…"
            rows={4}
            className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 text-base leading-relaxed outline-none"
          />

          {/* Mood */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Mood</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(mood === m ? null : m)}
                  className={[
                    'w-10 h-10 text-xl rounded-2xl transition-all active:scale-90',
                    mood === m
                      ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950 scale-110'
                      : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10',
                  ].join(' ')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Music */}
          <Field icon="🎵" placeholder="Música que tocava… (Artista - Nome)">
            <input
              type="text"
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder="Artista - Nome da música"
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 text-sm outline-none"
            />
          </Field>

          {/* Location */}
          <Field icon="📍" placeholder="">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Onde você estava?"
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 text-sm outline-none"
            />
          </Field>

          {/* People */}
          <Field icon="👥" placeholder="">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {people.map((p) => (
                <span key={p} className="tag-chip">
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
                placeholder="@pessoa"
                className="min-w-[70px] bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 text-sm outline-none"
              />
            </div>
          </Field>

          {/* Tags */}
          <Field icon="#" placeholder="">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {tags.map((t) => (
                <span key={t} className="tag-chip">
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
                placeholder="#tag"
                className="min-w-[60px] bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 text-sm outline-none"
              />
            </div>
          </Field>

          {/* Delete */}
          {memory && onDelete && (
            <div className="pt-2 pb-10">
              {showDeleteConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold"
                  >
                    Confirmar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-400 text-sm hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 transition-colors"
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

function Field({ icon, children }: { icon: string; placeholder: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-3">
      <span className="text-lg mt-0.5 flex-shrink-0">{icon}</span>
      {children}
    </div>
  );
}
