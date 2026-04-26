'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import type { Memory, MemoryFormData, Mood, PersonEntry } from '@/types';
import { X, Star, Music, MapPin, Tag } from 'lucide-react';
import PeopleField from '@/components/PeopleField';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const DEFAULT_MOODS: { emoji: string; label: string }[] = [
  { emoji: '😊', label: 'Feliz' },
  { emoji: '🥳', label: 'Comemorando' },
  { emoji: '😍', label: 'Apaixonado' },
  { emoji: '🤩', label: 'Animado' },
  { emoji: '😌', label: 'Tranquilo' },
  { emoji: '🥰', label: 'Carinhoso' },
  { emoji: '😂', label: 'Rindo' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '🥺', label: 'Saudade' },
  { emoji: '😤', label: 'Frustrado' },
  { emoji: '😴', label: 'Cansado' },
  { emoji: '🤔', label: 'Reflexivo' },
  { emoji: '😎', label: 'Confiante' },
  { emoji: '🫶', label: 'Gratidão' },
  { emoji: '🌟', label: 'Especial' },
  { emoji: '💫', label: 'Mágico' },
];

function getMoodGradient(mood: string | null): string {
  const map: Record<string, string> = {
    '😊': 'linear-gradient(135deg, #1E1A2E 0%, #131318 60%)',
    '🥳': 'linear-gradient(135deg, #261A1E 0%, #131318 60%)',
    '😍': 'linear-gradient(135deg, #1F1420 0%, #131318 60%)',
    '🤩': 'linear-gradient(135deg, #1F1D14 0%, #131318 60%)',
    '😌': 'linear-gradient(135deg, #141F1E 0%, #131318 60%)',
    '🥰': 'linear-gradient(135deg, #1F1820 0%, #131318 60%)',
    '😂': 'linear-gradient(135deg, #1F1D14 0%, #131318 60%)',
    '😢': 'linear-gradient(135deg, #14151F 0%, #131318 60%)',
    '🥺': 'linear-gradient(135deg, #191420 0%, #131318 60%)',
    '😤': 'linear-gradient(135deg, #1F1414 0%, #131318 60%)',
    '😴': 'linear-gradient(135deg, #141420 0%, #131318 60%)',
    '🤔': 'linear-gradient(135deg, #1A1A22 0%, #131318 60%)',
    '😎': 'linear-gradient(135deg, #141F1C 0%, #131318 60%)',
    '🫶': 'linear-gradient(135deg, #1F1420 0%, #131318 60%)',
    '🌟': 'linear-gradient(135deg, #1F1D14 0%, #131318 60%)',
    '💫': 'linear-gradient(135deg, #1A1720 0%, #131318 60%)',
  };
  return map[mood ?? ''] ?? 'linear-gradient(135deg, #1A1A22 0%, #131318 60%)';
}

interface MemoryModalProps {
  date: Date;
  memory?: Memory | null;
  initialEndDate?: string | null;
  onClose: () => void;
  onSave: (data: MemoryFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleteLabel?: string;
}

export default function MemoryModal({ date, memory, initialEndDate, onClose, onSave, onDelete, deleteLabel }: MemoryModalProps) {
  const [text, setText] = useState(memory?.text ?? '');
  const [mood, setMood] = useState<Mood | null>(memory?.mood ?? null);
  const [music, setMusic] = useState(
    memory?.music_data
      ? `${memory.music_data.title}${memory.music_data.artist ? ` - ${memory.music_data.artist}` : ''}`
      : memory?.music ?? ''
  );
  const [location, setLocation] = useState(memory?.location ?? '');
  const [isPinned, setIsPinned] = useState(memory?.is_pinned ?? false);
  const [tagInput, setTagInput] = useState('');
  const [people, setPeople] = useState<PersonEntry[]>(
    memory?.people?.map((p) => ({ name: p.name, user_id: p.user_id ?? null })) ?? []
  );
  const [tags, setTags] = useState<string[]>(memory?.tags?.map((t) => t.tag) ?? []);
  const [endDate] = useState<string | null>(memory?.end_date ?? initialEndDate ?? null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);
  const [showMusicAC, setShowMusicAC] = useState(false);
  const [memGroups, setMemGroups] = useState<{ name: string; emoji: string }[]>([]);

  const [suggestedPeople, setSuggestedPeople] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedMusics, setSuggestedMusics] = useState<string[]>([]);

  const textRef = useRef<HTMLTextAreaElement>(null);

  // Travar scroll do body — apenas mount/unmount, sem dependência de onClose
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fechar com Escape
  useEffect(() => {
    const handleEsc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Fetch suggestions on mount
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('memories')
        .select('memory_people(name), memory_tags(tag), memory_music(title, artist)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(300);
      if (data) {
        const pSet = new Set<string>();
        const tSet = new Set<string>();
        const mSet = new Set<string>();
        data.forEach((m: { memory_people?: { name: string }[]; memory_tags?: { tag: string }[]; memory_music?: { title: string; artist?: string }[] }) => {
          m.memory_people?.forEach((p) => pSet.add(p.name));
          m.memory_tags?.forEach((t) => tSet.add(t.tag));
          m.memory_music?.forEach((mu) => {
            const label = mu.artist ? `${mu.title} - ${mu.artist}` : mu.title;
            mSet.add(label);
          });
        });
        setSuggestedPeople(Array.from(pSet).sort());
        setSuggestedTags(Array.from(tSet).sort());
        setSuggestedMusics(Array.from(mSet));
      }
    };
    load();
  }, []);

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 320); }, []);

  // Busca grupos em que esta memória está
  useEffect(() => {
    const memId = memory?.id;
    if (!memId) return;
    let cancelled = false;
    createClient()
      .from('group_memories')
      .select('groups(name, emoji)')
      .eq('memory_id', memId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMemGroups(
          data.flatMap((r) => {
            const g = r.groups as { name: string; emoji: string } | null;
            return g ? [g] : [];
          })
        );
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id]);

  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [text, autoResize]);

  // Music autocomplete
  const musicSuggestions = useMemo(() => {
    if (!music.trim()) return suggestedMusics.slice(0, 5);
    return suggestedMusics.filter((m) => m.toLowerCase().includes(music.toLowerCase())).slice(0, 5);
  }, [music, suggestedMusics]);

  const handleMusicChange = (value: string) => {
    setMusic(value);
    setShowMusicAC(suggestedMusics.length > 0);
  };

  const addTag = (tag?: string) => {
    const t = (tag ?? tagInput).trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    if (!tag) setTagInput('');
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && tagInput === '') setTags((t) => t.slice(0, -1));
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave({ text, mood, music, location, people, tags, is_pinned: isPinned, end_date: endDate });
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

  const tagSuggestions = suggestedTags.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(tagInput.replace(/^#/, '').toLowerCase())
  ).slice(0, 5);

  return (
    <>
      {/* Overlay com blur */}
      <div className="sheet-overlay" onClick={onClose} />

      {/* Sheet lateral */}
      <div className="memory-sheet">

        {/* Handle mobile */}
        <div className="sheet-handle-mobile" />

        {/* ── Header ── */}
        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose}>
            <X size={16} />
          </button>

          <div className="sheet-date-info">
            {endDate ? (
              <>
                <span className="sheet-day-name">
                  <span className="capitalize">{format(date, 'EEE', { locale: ptBR })}</span>
                  {' → '}
                  <span className="capitalize">{format(new Date(endDate + 'T12:00:00'), 'EEE', { locale: ptBR })}</span>
                </span>
                <span className="sheet-date-label">
                  {format(date, "d 'de' MMM", { locale: ptBR })} → {format(new Date(endDate + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                </span>
              </>
            ) : (
              <>
                <span className="sheet-day-name capitalize">
                  {format(date, 'EEEE', { locale: ptBR })}
                </span>
                <span className="sheet-date-label">
                  {format(date, "d 'de' MMMM", { locale: ptBR })}
                </span>
              </>
            )}
          </div>

          <div className="sheet-actions">
            <button className="sheet-pin" onClick={() => setIsPinned((p) => !p)}>
              <Star
                size={17}
                fill={isPinned ? 'var(--accent-amber)' : 'none'}
                stroke={isPinned ? 'var(--accent-amber)' : '#4A4A58'}
                strokeWidth={1.5}
              />
            </button>
            <button
              className="sheet-save"
              onClick={handleSave}
              disabled={!text.trim() || saving}
            >
              {saving ? '…' : memory ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>

        {/* ── Body scrollável ── */}
        <div className="sheet-body">

          {/* Capa de mood */}
          <div
            className="sheet-mood-banner"
            style={{ background: getMoodGradient(mood) }}
          >
            <span className="sheet-mood-emoji">{mood ?? '✨'}</span>
          </div>

          {/* Textarea */}
          <div className="sheet-text-area">
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => { setText(e.target.value); autoResize(); }}
              placeholder="O que aconteceu hoje?"
              className="sheet-textarea"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Mood strip */}
          <div className="sheet-section">
            <div className="mood-strip">
              {DEFAULT_MOODS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => setMood(mood === emoji ? null : emoji as Mood)}
                  className={`mood-orb${mood === emoji ? ' active' : ''}`}
                  title={label}
                >
                  {emoji}
                </button>
              ))}

              <button
                className="mood-orb mood-more"
                onClick={() => setShowPicker((v) => !v)}
                title="Mais emojis"
              >
                ＋
              </button>

              {showPicker && (
                <div className="emoji-picker-wrapper">
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: { native: string }) => {
                      setMood(emoji.native as Mood);
                      setShowPicker(false);
                    }}
                    locale="pt"
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Campos */}
          <div className="sheet-fields">

            {/* Music — com autocomplete customizado */}
            <div className="field-row">
              <div className="field-icon"><Music size={15} /></div>
              <div className="field-ac-wrapper">
                <input
                  type="text"
                  value={music}
                  onChange={(e) => handleMusicChange(e.target.value)}
                  onFocus={() => setShowMusicAC(suggestedMusics.length > 0)}
                  onBlur={() => setTimeout(() => setShowMusicAC(false), 150)}
                  placeholder="Adicionar música..."
                  className="field-input"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {showMusicAC && musicSuggestions.length > 0 && (
                  <div className="custom-dropdown">
                    {musicSuggestions.map((s) => (
                      <button
                        key={s}
                        className="dropdown-item"
                        onMouseDown={(e) => { e.preventDefault(); setMusic(s); setShowMusicAC(false); }}
                      >
                        <Music size={12} />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="field-row">
              <div className="field-icon"><MapPin size={15} /></div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Onde foi?"
                className="field-input"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* People — autocomplete com busca de usuários reais */}
            <PeopleField
              value={people}
              onChange={setPeople}
              historySuggestions={suggestedPeople}
            />

            {/* Tags — autocomplete customizado */}
            <div className="relative">
              <div className="field-row" style={{ borderBottom: 'none' }}>
                <div className="field-icon"><Tag size={15} /></div>
                <div className="chips-inline">
                  {tags.map((t) => (
                    <span key={t} className="chip-tag">
                      #{t}
                      <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <div className="field-ac-wrapper">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKey}
                      onFocus={() => setTagFocused(true)}
                      onBlur={() => { setTimeout(() => setTagFocused(false), 150); addTag(); }}
                      placeholder={tags.length === 0 ? '+ Adicionar tag' : ''}
                      className="chip-input"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    {tagFocused && tagSuggestions.length > 0 && (
                      <div className="custom-dropdown">
                        {tagSuggestions.map((s) => (
                          <button
                            key={s}
                            className="dropdown-item"
                            onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                          >
                            <Tag size={12} />
                            #{s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Grupos */}
          {memGroups.length > 0 && (
            <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0, paddingTop: '2px', color: 'var(--text-muted)' }}>👥</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {memGroups.map((g, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: 'var(--text-secondary)',
                      background: 'rgba(155,143,255,0.08)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px', padding: '3px 10px',
                    }}>
                      {g.emoji} {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deletar */}
          {memory && onDelete && (
            showDeleteConfirm ? (
              <div className="flex gap-2 px-6 py-4" style={{ borderTop: '0.5px solid var(--border)' }}>
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
              <button onClick={() => setShowDeleteConfirm(true)} className="sheet-delete">
                {deleteLabel ?? 'Excluir memória'}
              </button>
            )
          )}

          <div className="h-8" />
        </div>
      </div>
    </>
  );
}
