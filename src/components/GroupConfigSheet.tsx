'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Group } from '@/types';

const GROUP_EMOJIS = ['👥', '👨‍👩‍👧‍👦', '🎉', '✈️', '🏖️', '🎓', '💼', '🏠', '❤️', '🌍'];

interface Props {
  group: Group;
  myRole: 'admin' | 'member';
  userId: string;
  onClose: () => void;
  onUpdated: (group: Group) => void;
  onLeft: () => void;
  onDeleted: () => void;
}

export default function GroupConfigSheet({ group, myRole, userId, onClose, onUpdated, onLeft, onDeleted }: Props) {
  const [emoji, setEmoji] = useState(group.emoji);
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const supabase = createClient();

  const isAdmin = myRole === 'admin';
  const isOwner = group.created_by === userId;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('groups')
      .update({ name: name.trim(), emoji, updated_at: new Date().toISOString() })
      .eq('id', group.id);
    setSaving(false);
    if (!error) onUpdated({ ...group, name: name.trim(), emoji });
  };

  const handleLeave = async () => {
    setSaving(true);
    await supabase.from('group_members').delete()
      .eq('group_id', group.id).eq('user_id', userId);
    setSaving(false);
    onLeft();
  };

  const handleDelete = async () => {
    if (deleteInput !== group.name || saving) return;
    setSaving(true);
    await supabase.from('group_memories').delete().eq('group_id', group.id);
    await supabase.from('group_members').delete().eq('group_id', group.id);
    await supabase.from('groups').delete().eq('id', group.id);
    setSaving(false);
    onDeleted();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="memory-sheet" style={{ zIndex: 50 }}>
        <div className="sheet-handle-mobile" />

        <div className="sheet-header">
          <button className="sheet-close" onClick={onClose}><X size={16} /></button>
          <div className="sheet-date-info">
            <span className="sheet-date-label">Configurações</span>
          </div>
          {isAdmin ? (
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="sheet-save"
            >
              {saving ? '…' : 'Salvar'}
            </button>
          ) : (
            <div style={{ width: 60 }} />
          )}
        </div>

        <div className="sheet-body" style={{ padding: '24px' }}>
          {isAdmin && (
            <>
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
              <div style={{ marginBottom: '32px' }}>
                <p className="group-field-label">Nome do grupo</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 50))}
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
              </div>
            </>
          )}

          {/* Sair do grupo (não-admins) */}
          {!isAdmin && (
            <div style={{ marginBottom: '16px' }}>
              {confirmLeave ? (
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px', margin: '0 0 12px' }}>
                    Sair de <strong>{group.name}</strong>?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setConfirmLeave(false)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleLeave}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.12)', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600 }}
                    >
                      {saving ? '...' : 'Sair'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeave(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500 }}
                >
                  Sair do grupo
                </button>
              )}
            </div>
          )}

          {/* Excluir grupo (somente criador) */}
          {isOwner && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                Zona de perigo
              </p>
              {confirmDelete ? (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', margin: '0 0 10px' }}>
                    Digite <strong style={{ color: 'var(--text-primary)' }}>{group.name}</strong> para confirmar a exclusão permanente:
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder={group.name}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      marginBottom: '10px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteInput !== group.name || saving}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: deleteInput === group.name ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.04)', color: '#EF4444', cursor: deleteInput === group.name ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, opacity: deleteInput === group.name ? 1 : 0.4 }}
                    >
                      {saving ? '...' : 'Excluir'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                >
                  Excluir grupo permanentemente
                </button>
              )}
            </div>
          )}

          <div style={{ height: '32px' }} />
        </div>
      </div>
    </>
  );
}
