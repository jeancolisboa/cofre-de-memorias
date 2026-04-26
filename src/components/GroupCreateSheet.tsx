'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const GROUP_EMOJIS = ['👥', '👨‍👩‍👧‍👦', '🎉', '✈️', '🏖️', '🎓', '💼', '🏠', '❤️', '🌍'];

interface Props {
  onClose: () => void;
  onCreate: (groupId: string) => void;
}

export default function GroupCreateSheet({ onClose, onCreate }: Props) {
  const [emoji, setEmoji] = useState('👥');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    const { data: groupId, error: rpcError } = await supabase.rpc('create_group_with_admin', {
      p_name: name.trim(),
      p_emoji: emoji,
    });
    setSaving(false);
    if (rpcError || !groupId) {
      setError('Erro ao criar grupo. Tente novamente.');
      return;
    }
    onCreate(groupId as string);
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="memory-sheet" style={{ zIndex: 50 }}>
        <div className="sheet-handle-mobile" />

        {/* Header */}
        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose}><X size={16} /></button>
          <div className="sheet-date-info">
            <span className="sheet-date-label">Novo grupo</span>
          </div>
          <div style={{ width: 30 }} />
        </div>

        <div className="sheet-body" style={{ padding: '24px' }}>
          {/* Emoji picker */}
          <div style={{ marginBottom: '24px' }}>
            <p className="group-field-label">Emoji do grupo</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '10px' }}>
              {GROUP_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    fontSize: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: `1.5px solid ${emoji === e ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: emoji === e ? 'rgba(155,143,255,0.12)' : 'var(--bg-card)',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: '24px' }}>
            <p className="group-field-label">Nome do grupo</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 50))}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Ex: Família, Nakamas..."
              autoFocus
              style={{
                display: 'block',
                marginTop: '10px',
                width: '100%',
                padding: '13px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
              {name.length}/50
            </p>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#EF4444', marginBottom: '12px' }}>{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="new-memory-btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              opacity: (!name.trim() || saving) ? 0.5 : 1,
              cursor: (!name.trim() || saving) ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              padding: '14px',
              borderRadius: '12px',
            }}
          >
            {saving ? 'Criando...' : `${emoji} Criar grupo`}
          </button>

          <div style={{ height: '32px' }} />
        </div>
      </div>
    </>
  );
}
