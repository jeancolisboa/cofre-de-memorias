'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PersonEntry, Profile } from '@/types';
import { X, Users } from 'lucide-react';

interface PeopleFieldProps {
  value: PersonEntry[];
  onChange: (people: PersonEntry[]) => void;
  /** Sugestões do histórico local (nomes já usados antes) */
  historySuggestions: string[];
}

export default function PeopleField({ value, onChange, historySuggestions }: PeopleFieldProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // ── Busca com debounce 300ms ──────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (input.trim().length < 2) {
      setProfileResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const term = input.trim();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .or(`display_name.ilike.%${term}%,email.ilike.%${term}%`)
        .neq('id', user.id)
        .limit(5);

      setProfileResults(data ?? []);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, supabase]);

  // Reseta seleção ao atualizar resultados
  useEffect(() => { setActiveIndex(0); }, [profileResults]);

  // ── Helpers ───────────────────────────────────────────────────
  const addEntry = useCallback((entry: PersonEntry) => {
    const exists = value.some((p) =>
      entry.user_id
        ? p.user_id === entry.user_id
        : p.name.toLowerCase() === entry.name.toLowerCase()
    );
    if (!exists) onChange([...value, entry]);
    setInput('');
    setProfileResults([]);
  }, [value, onChange]);

  const addFreeText = useCallback((text?: string) => {
    const name = (text ?? input).trim().replace(/^@/, '');
    if (!name) return;
    addEntry({ name, user_id: null });
  }, [input, addEntry]);

  const removePerson = (index: number) => onChange(value.filter((_, i) => i !== index));

  const getInitial = (name: string | null, email: string | null) =>
    ((name ?? email ?? '?')[0]).toUpperCase();

  // ── Estados de visibilidade do dropdown ──────────────────────
  const showProfileDropdown = focused && input.trim().length >= 2;
  // Para 1 char: mostra sugestões do histórico local
  const historyFiltered = useMemo(() =>
    input.trim().length === 1
      ? historySuggestions
          .filter((s) => !value.some((p) => p.name === s) && s.toLowerCase().includes(input.toLowerCase()))
          .slice(0, 5)
      : [],
    [input, historySuggestions, value]
  );
  const showHistoryDropdown = focused && historyFiltered.length > 0;

  // Total de itens para navegação: perfis + 1 item de texto livre
  const totalDropdownItems = profileResults.length + 1;

  // ── Teclado ───────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalDropdownItems - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Tab' && showProfileDropdown) {
      e.preventDefault();
      if (profileResults.length > 0) {
        const p = profileResults[0];
        addEntry({ name: p.display_name || p.email || input, user_id: p.id });
      } else {
        addFreeText();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (showProfileDropdown) {
        if (activeIndex < profileResults.length) {
          const p = profileResults[activeIndex];
          addEntry({ name: p.display_name || p.email || input, user_id: p.id });
        } else {
          addFreeText();
        }
      } else {
        addFreeText();
      }
      return;
    }
    if (e.key === 'Backspace' && input === '') {
      onChange(value.slice(0, -1));
      return;
    }
    if (e.key === 'Escape') {
      setFocused(false);
      setInput('');
    }
  };

  return (
    <div className="relative">
      <div className="field-row">
        <div className="field-icon"><Users size={15} /></div>
        <div className="chips-inline">

          {/* Chips */}
          {value.map((person, i) => (
            <span
              key={`${person.user_id ?? person.name}-${i}`}
              className={`chip-person${person.user_id ? ' chip-person--linked' : ''}`}
            >
              {person.user_id && (
                <svg
                  width="9" height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                  style={{ flexShrink: 0, opacity: 0.75 }}
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
              {person.name}
              <button type="button" onClick={() => removePerson(i)} aria-label={`Remover ${person.name}`}>
                <X size={10} />
              </button>
            </span>
          ))}

          {/* Input + dropdowns */}
          <div className="field-ac-wrapper">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                const inputValue = e.target.value;
                setTimeout(() => {
                  setFocused(false);
                  if (inputValue.trim()) addFreeText(inputValue);
                }, 160);
              }}
              placeholder={value.length === 0 ? '+ Adicionar pessoa' : ''}
              className="chip-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* Dropdown de perfis (2+ chars) */}
            {showProfileDropdown && (
              <div className="people-dropdown">
                {profileResults.map((profile, i) => (
                  <button
                    key={profile.id}
                    type="button"
                    className={`people-dropdown-item${activeIndex === i ? ' active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addEntry({
                        name: profile.display_name || profile.email || input,
                        user_id: profile.id,
                      });
                    }}
                  >
                    <div className="people-avatar">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="people-avatar-img" referrerPolicy="no-referrer" />
                        : <span>{getInitial(profile.display_name, profile.email)}</span>
                      }
                    </div>
                    <div className="people-info">
                      <span className="people-name">{profile.display_name || profile.email}</span>
                      {profile.display_name && profile.email && (
                        <span className="people-email">{profile.email}</span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Sempre: opção de texto livre */}
                <button
                  type="button"
                  className={`people-dropdown-item people-dropdown-item--freetext${activeIndex === profileResults.length ? ' active' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); addFreeText(); }}
                >
                  <div className="people-avatar people-avatar--plus">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                  <div className="people-info">
                    <span className="people-name">
                      Adicionar <em style={{ fontStyle: 'normal', opacity: 0.7 }}>"{input.trim()}"</em> como texto livre
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Dropdown de histórico (1 char) */}
            {showHistoryDropdown && (
              <div className="custom-dropdown">
                {historyFiltered.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="dropdown-item"
                    onMouseDown={(e) => { e.preventDefault(); addFreeText(s); }}
                  >
                    <Users size={12} />
                    @{s}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
