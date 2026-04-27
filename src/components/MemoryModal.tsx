'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import type { Memory, MemoryFormData, Mood, PersonEntry, MemoryPhoto } from '@/types';
import { X, Star, Music, MapPin, Tag, Camera, Bookmark, CalendarDays, ExternalLink } from 'lucide-react';
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

// ── Polaroid Photo ────────────────────────────
function PolaroidPhoto({
  photo,
  rotation,
  overlap,
  memoryText,
  onDelete,
}: {
  photo: MemoryPhoto;
  rotation: number;
  overlap: boolean;
  memoryText: string;
  onDelete: (p: MemoryPhoto) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    createClient()
      .storage.from('memory-photos')
      .createSignedUrl(photo.storage_path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [photo.storage_path]);

  const caption = memoryText.length > 22 ? memoryText.slice(0, 22) + '…' : memoryText;

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: '#ffffff',
          padding: '8px 8px 28px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          borderRadius: '2px',
          marginLeft: overlap ? '-12px' : '0',
          transform: hovered
            ? 'scale(1.05) rotate(0deg)'
            : `rotate(${rotation}deg)`,
          transition: 'transform 180ms ease',
          zIndex: hovered ? 10 : 1,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => url && setLightbox(true)}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            style={{
              width: '80px', height: '80px', objectFit: 'cover', display: 'block',
              border: '2px solid #000',
            }}
          />
        ) : (
          <div style={{ width: '80px', height: '80px', background: '#e0e0e0', border: '1px solid #222' }} />
        )}
        {/* Caption cursiva */}
        <div style={{
          position: 'absolute', bottom: '4px', left: '0', right: '0',
          textAlign: 'center',
          fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
          fontSize: '10px', color: '#333',
          lineHeight: 1.2, padding: '0 4px',
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {caption}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
          style={{
            position: 'absolute', top: '3px', right: '3px',
            background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
            width: '18px', height: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', padding: 0,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 150ms',
          }}
        >
          <X size={10} color="#fff" />
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && url && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: '12px 12px 40px 12px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              borderRadius: '2px',
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{
                display: 'block',
                maxWidth: 'min(480px, 80vw)',
                maxHeight: '70vh',
                objectFit: 'contain',
                border: '2px solid #000',
              }}
            />
            <div style={{
              position: 'absolute', bottom: '10px', left: '0', right: '0',
              textAlign: 'center',
              fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
              fontSize: '15px', color: '#333',
            }}>
              {memoryText.length > 40 ? memoryText.slice(0, 40) + '…' : memoryText}
            </div>
            <button
              onClick={() => setLightbox(false)}
              style={{
                position: 'absolute', top: '6px', right: '6px',
                background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                width: '24px', height: '24px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}
            >
              <X size={13} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Memory Hero ───────────────────────────────
function MemoryHero({
  mood,
  title,
  text,
  date,
  endDate,
  photos,
  uploading,
  isPinned,
  onTogglePin,
  onClose,
  onAddPhoto,
  onDeletePhoto,
  photoInputRef,
  onUpload,
}: {
  mood: Mood | null;
  title: string;
  text: string;
  date: Date;
  endDate: string | null;
  photos: MemoryPhoto[];
  uploading: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  onAddPhoto: () => void;
  onDeletePhoto: (photo: MemoryPhoto) => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  // Busca signed URLs para todas as fotos
  useEffect(() => {
    if (!photos.length) { setCoverUrls([]); return; }
    const supabase = createClient();
    Promise.all(
      photos.map((p) =>
        supabase.storage.from('memory-photos').createSignedUrl(p.storage_path, 3600)
          .then(({ data }) => data?.signedUrl ?? null)
      )
    ).then((urls) => setCoverUrls(urls.filter(Boolean) as string[]));
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avança carrossel a cada 4s quando há mais de 1 foto
  useEffect(() => {
    if (coverUrls.length <= 1) return;
    const id = setInterval(() => setCoverIndex((i) => (i + 1) % coverUrls.length), 4000);
    return () => clearInterval(id);
  }, [coverUrls.length]);

  // Garante que coverIndex não ultrapasse o array após remoção
  useEffect(() => {
    if (coverUrls.length > 0 && coverIndex >= coverUrls.length) {
      setCoverIndex(coverUrls.length - 1);
    }
  }, [coverUrls.length, coverIndex]);

  const currentUrl = coverUrls[coverIndex] ?? null;

  const dateLabel = endDate
    ? `${format(date, "d 'de' MMM", { locale: ptBR })} → ${format(new Date(endDate + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}`
    : format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '280px',
      background: 'linear-gradient(135deg, #16161F 0%, #1e1e2e 100%)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Foto de fundo (carrossel) */}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={coverIndex}
          src={currentUrl}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            animation: 'heroFadeIn 0.6s ease',
          }}
        />
      )}
      {/* Indicador de carrossel */}
      {coverUrls.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '12px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: '5px',
        }}>
          {coverUrls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCoverIndex(i)}
              style={{
                width: i === coverIndex ? '16px' : '6px',
                height: '6px', borderRadius: '3px',
                background: i === coverIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'width 300ms, background 300ms',
              }}
            />
          ))}
        </div>
      )}

      {/* Overlay gradiente */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, transparent 30%, rgba(15,15,20,0.95) 100%)',
      }} />

      {/* Título + data — sobre o overlay */}
      <div style={{
        position: 'absolute', bottom: '20px', left: 0, right: 0,
        padding: '0 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      }}>
        {title && (
          <p style={{
            color: '#fff', fontSize: '22px', fontWeight: 600,
            lineHeight: 1.25, textAlign: 'center',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            margin: 0,
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {mood && <span style={{ fontSize: '28px', lineHeight: 1, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))', flexShrink: 0 }}>{mood}</span>}
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</span>
          </p>
        )}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '20px', padding: '4px 12px',
          color: 'rgba(255,255,255,0.85)', fontSize: '12px',
          backdropFilter: 'blur(4px)',
          textTransform: 'capitalize',
        }}>
          <CalendarDays size={11} />
          {dateLabel}
        </span>
      </div>

      {/* X — canto superior esquerdo */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '14px', left: '14px',
          width: '32px', height: '32px',
          background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
        }}
      >
        <X size={15} />
      </button>

      {/* Câmera + pin — canto superior direito */}
      <div style={{
        position: 'absolute', top: '14px', right: '14px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <button
          onClick={onTogglePin}
          style={{
            width: '32px', height: '32px',
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Star
            size={14}
            fill={isPinned ? 'var(--accent-amber)' : 'none'}
            stroke={isPinned ? 'var(--accent-amber)' : 'rgba(255,255,255,0.8)'}
            strokeWidth={1.8}
          />
        </button>
        <button
          onClick={onAddPhoto}
          disabled={uploading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            height: '32px', padding: '0 12px',
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.9)', fontSize: '12px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Camera size={13} />
          {uploading ? '…' : photos.length > 0 ? `${photos.length}` : '＋'}
        </button>
      </div>

      {/* Remover foto atual — canto inferior esquerdo, só aparece com fotos */}
      {photos.length > 0 && photos[coverIndex] && (
        <button
          onClick={() => onDeletePhoto(photos[coverIndex])}
          title="Remover esta foto"
          style={{
            position: 'absolute', bottom: '12px', left: '14px',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            height: '28px', padding: '0 10px',
            background: 'rgba(239,68,68,0.45)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: '20px',
            color: '#fff', fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <X size={11} />
          Remover foto
        </button>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={onUpload}
      />
    </div>
  );
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
  const [title, setTitle] = useState(memory?.title ?? '');
  const [text, setText] = useState(memory?.text ?? '');
  const [mood, setMood] = useState<Mood | null>(memory?.mood ?? null);
  const [dateValue, setDateValue] = useState(format(date, 'yyyy-MM-dd'));
  const [music, setMusic] = useState(
    memory?.music_data
      ? `${memory.music_data.title}${memory.music_data.artist ? ` - ${memory.music_data.artist}` : ''}`
      : memory?.music ?? ''
  );
  // Só mostra o card após confirmação (seleção no AC, Enter ou blur com valor)
  const [musicConfirmed, setMusicConfirmed] = useState(
    !!(memory?.music_data || memory?.music)
  );
  const [location, setLocation] = useState(memory?.location ?? '');
  const [isPinned, setIsPinned] = useState(memory?.is_pinned ?? false);
  const [tagInput, setTagInput] = useState('');
  const [people, setPeople] = useState<PersonEntry[]>(
    memory?.people?.map((p) => ({ name: p.name, user_id: p.user_id ?? null })) ?? []
  );
  const [tags, setTags] = useState<string[]>(memory?.tags?.map((t) => t.tag) ?? []);
  const [endDate] = useState<string | null>(memory?.end_date ?? initialEndDate ?? null);
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);
  const [showMusicAC, setShowMusicAC] = useState(false);
  const [memGroups, setMemGroups] = useState<{ name: string; emoji: string }[]>([]);

  const [suggestedPeople, setSuggestedPeople] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedMusics, setSuggestedMusics] = useState<string[]>([]);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 320); }, []);

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
            const g = r.groups as unknown as { name: string; emoji: string } | null;
            return g ? [g] : [];
          })
        );
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id]);

  // Carrega fotos da memória
  useEffect(() => {
    const memId = memory?.id;
    if (!memId) return;
    let cancelled = false;
    createClient()
      .from('memory_photos')
      .select('*')
      .eq('memory_id', memId)
      .order('created_at')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPhotos(data as MemoryPhoto[]);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !memory?.id) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingPhotos(true);
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) continue; // skip >5MB
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${memory.id}/${crypto.randomUUID()}.${ext}`;
        const { error: storageErr } = await supabase.storage
          .from('memory-photos')
          .upload(path, file, { upsert: false });
        if (storageErr) continue;
        const { data: row } = await supabase
          .from('memory_photos')
          .insert({ memory_id: memory.id, storage_path: path })
          .select()
          .single();
        if (row) setPhotos((prev) => [...prev, row as MemoryPhoto]);
      }
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoDelete = async (photo: MemoryPhoto) => {
    const supabase = createClient();
    await supabase.storage.from('memory-photos').remove([photo.storage_path]);
    await supabase.from('memory_photos').delete().eq('id', photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  // Rotação determinística por foto (seed = soma dos char codes do id)
  const photoRotation = (id: string) => {
    const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ((seed % 7) - 3); // -3 a +3 graus
  };

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
    setMusicConfirmed(false);
    setShowMusicAC(suggestedMusics.length > 0);
  };

  const confirmMusic = (value?: string) => {
    const v = value ?? music;
    if (v.trim()) { setMusic(v); setMusicConfirmed(true); }
    setShowMusicAC(false);
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
    if (!title.trim() && !text.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ title, text, mood, music, location, people, tags, is_pinned: isPinned, end_date: endDate, date: memory ? undefined : dateValue });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
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

  const displayText = title.trim() ? title : text;

  // Parse música para extrair título/artista
  const musicTitle = music.includes(' - ') ? music.split(' - ')[0] : music;
  const musicArtist = music.includes(' - ') ? music.split(' - ').slice(1).join(' - ') : null;

  const S: React.CSSProperties = {
    padding: '20px 20px 0',
  };
  const labelCss: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  };
  const dividerCss: React.CSSProperties = {
    borderTop: '0.5px solid var(--border)',
    margin: '0',
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />

      <div className="memory-sheet" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="sheet-handle-mobile" />

        {/* ── Hero ── */}
        <MemoryHero
          mood={mood}
          title={title}
          text={text}
          date={date}
          endDate={endDate}
          photos={photos}
          uploading={uploadingPhotos}
          isPinned={isPinned}
          onTogglePin={() => setIsPinned((p) => !p)}
          onClose={onClose}
          onAddPhoto={() => photoInputRef.current?.click()}
          onDeletePhoto={handlePhotoDelete}
          photoInputRef={photoInputRef}
          onUpload={handlePhotoUpload}
        />

        {/* ── Body scrollável ── */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '88px' }}>

          {/* ── Como você estava? (Mood) ── */}
          <div style={S}>
            <label style={labelCss}>Como você estava se sentindo?</label>
            <div className="mood-strip" style={{ paddingBottom: '4px' }}>
              {DEFAULT_MOODS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => setMood(mood === emoji ? null : emoji as Mood)}
                  title={label}
                  style={{
                    fontSize: '22px', lineHeight: 1,
                    width: '40px', height: '40px',
                    borderRadius: '50%', border: 'none',
                    cursor: 'pointer',
                    background: mood === emoji ? 'rgba(155,143,255,0.15)' : 'transparent',
                    outline: mood === emoji ? '2px solid var(--accent-purple)' : '2px solid transparent',
                    outlineOffset: '1px',
                    transition: 'all 120ms',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowPicker((v) => !v)}
                title="Mais emojis"
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  border: '1.5px dashed var(--border)',
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
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

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── Data (só em criação nova) ── */}
          {!memory && (
            <div style={S}>
              <label style={labelCss}>Data</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '10px 14px',
              }}>
                <CalendarDays size={15} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
                <input
                  type="date"
                  value={dateValue}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => e.target.value && setDateValue(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: '14px', color: 'var(--text-primary)',
                    colorScheme: 'dark',
                  }}
                />
              </div>
            </div>
          )}

          {!memory && <div style={{ ...dividerCss, margin: '20px 0 0' }} />}

          {/* ── Título da memória ── */}
          <div style={S}>
            <label style={labelCss}>Título</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da memória..."
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)',
                  paddingBottom: '8px',
                }}
                autoComplete="off" autoCorrect="off" spellCheck={false}
              />
            </div>
          </div>

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── O que aconteceu? (Textarea) ── */}
          <div style={S}>
            <label style={labelCss}>O que aconteceu?</label>
            <div style={{ position: 'relative' }}>
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => { setText(e.target.value); autoResize(); }}
                placeholder="Escreva sua memória..."
                className="sheet-textarea"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ paddingBottom: '24px' }}
              />
              <span style={{
                position: 'absolute', bottom: '6px', right: '0',
                fontSize: '11px', color: text.length > 260 ? 'var(--accent-pink)' : 'var(--text-muted)',
                pointerEvents: 'none',
              }}>
                {text.length}/300
              </span>
            </div>
          </div>

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── Música do momento ── */}
          <div style={S}>
            <label style={labelCss}>Música do momento</label>
            {music && musicConfirmed ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border)',
                borderRadius: '12px', padding: '10px 12px',
              }}>
                {/* Thumbnail placeholder */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1e1e2e, #2a1e3e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Music size={18} color="var(--accent-purple)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {musicTitle}
                  </div>
                  {musicArtist && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {musicArtist}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(music)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: 600, color: '#1DB954',
                      background: 'rgba(29,185,84,0.1)',
                      border: '1px solid rgba(29,185,84,0.25)',
                      borderRadius: '20px', padding: '4px 10px',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={10} />
                    Spotify
                  </a>
                  <button
                    onClick={() => { setMusic(''); setMusicConfirmed(false); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="field-ac-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px' }}>
                  <Music size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    value={music}
                    onChange={(e) => handleMusicChange(e.target.value)}
                    onFocus={() => setShowMusicAC(suggestedMusics.length > 0)}
                    onBlur={() => setTimeout(() => { setShowMusicAC(false); if (music.trim()) confirmMusic(); }, 150)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmMusic(); } }}
                    placeholder="Buscar música..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)' }}
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                </div>
                {showMusicAC && musicSuggestions.length > 0 && (
                  <div className="custom-dropdown">
                    {musicSuggestions.map((s) => (
                      <button key={s} className="dropdown-item" onMouseDown={(e) => { e.preventDefault(); confirmMusic(s); }}>
                        <Music size={12} />{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── Onde foi? (Local) ── */}
          <div style={S}>
            <label style={labelCss}>Onde foi?</label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '10px 14px',
            }}>
              <MapPin size={15} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Adicionar local..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text-primary)' }}
                autoComplete="off" autoCorrect="off" spellCheck={false}
              />
              {location && (
                <button
                  onClick={() => setLocation('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── Com quem estava? (Pessoas) ── */}
          <div style={S}>
            <label style={labelCss}>Com quem estava?</label>
            <PeopleField value={people} onChange={setPeople} historySuggestions={suggestedPeople} />
          </div>

          <div style={{ ...dividerCss, margin: '20px 0 0' }} />

          {/* ── Tags ── */}
          <div style={S}>
            <label style={labelCss}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {tags.map((t) => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: 500,
                  color: 'var(--accent-green)',
                  background: 'rgba(77,170,90,0.1)',
                  border: '1px solid rgba(77,170,90,0.25)',
                  borderRadius: '20px', padding: '4px 10px',
                }}>
                  #{t}
                  <button
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex', opacity: 0.7 }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="field-ac-wrapper" style={{ position: 'relative' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', color: 'var(--text-muted)',
                  border: '1.5px dashed var(--border)',
                  borderRadius: '20px', padding: '4px 10px',
                }}>
                  <Tag size={11} />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKey}
                    onFocus={() => setTagFocused(true)}
                    onBlur={() => { setTimeout(() => setTagFocused(false), 150); addTag(); }}
                    placeholder="Nova tag"
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text-primary)', width: '64px' }}
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                </span>
                {tagFocused && tagSuggestions.length > 0 && (
                  <div className="custom-dropdown">
                    {tagSuggestions.map((s) => (
                      <button key={s} className="dropdown-item" onMouseDown={(e) => { e.preventDefault(); addTag(s); }}>
                        <Tag size={12} />#{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Grupos ── */}
          {memGroups.length > 0 && (
            <>
              <div style={{ ...dividerCss, margin: '20px 0 0' }} />
              <div style={S}>
                <label style={labelCss}>Grupos</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {memGroups.map((g, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: 'var(--text-secondary)',
                      background: 'rgba(155,143,255,0.08)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px', padding: '4px 12px',
                    }}>
                      {g.emoji} {g.name}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Deletar ── */}
          {memory && onDelete && (
            <div style={{ padding: '24px 20px 8px' }}>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      flex: 1, height: '44px', borderRadius: '22px',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      flex: 1, height: '44px', borderRadius: '22px',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#EF4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Confirmar exclusão
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: '100%', height: '40px', borderRadius: '20px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(239,68,68,0.6)', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {deleteLabel ?? 'Excluir memória'}
                </button>
              )}
            </div>
          )}

          <div style={{ height: '12px' }} />
        </div>

        {/* ── Bottom fixo: Salvar ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 20px 20px',
          background: 'linear-gradient(to top, var(--bg-card) 70%, transparent)',
          pointerEvents: 'none',
        }}>
          {saveError && (
            <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '8px', pointerEvents: 'all' }}>
              {saveError}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={(!title.trim() && !text.trim()) || saving}
            style={{
              pointerEvents: 'all',
              width: '100%', height: '52px',
              borderRadius: '26px',
              background: (!title.trim() && !text.trim()) || saving ? 'var(--border)' : 'var(--accent-purple)',
              border: 'none',
              color: (!title.trim() && !text.trim()) || saving ? 'var(--text-muted)' : '#fff',
              fontSize: '15px', fontWeight: 600,
              cursor: (!title.trim() && !text.trim()) || saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 200ms, color 200ms',
              boxShadow: (!title.trim() && !text.trim()) || saving ? 'none' : '0 4px 20px rgba(155,143,255,0.35)',
            }}
          >
            <Bookmark size={17} />
            {saving ? 'Salvando…' : memory ? 'Salvar memória' : 'Criar memória'}
          </button>
        </div>
      </div>
    </>
  );
}
