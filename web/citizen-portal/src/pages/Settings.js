import React, { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import API from '../api';
import { theme } from '../styles/theme';
import { KeyRound, Plus, Trash2, ShieldCheck } from 'lucide-react';

export default function Settings() {
    const [keys, setKeys]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding]   = useState(false);
    const [msg, setMsg]         = useState({ type: '', text: '' });

    const citizenId = JSON.parse(localStorage.getItem('citizenData') || '{}')?.citizenId;

    useEffect(() => { loadKeys(); }, []);

    const loadKeys = async () => {
        setLoading(true);
        try {
            const res = await API.get('/api/webauthn/my-keys');
            setKeys(res.data.keys || []);
        } catch { } finally { setLoading(false); }
    };

    const handleAddKey = async () => {
        setAdding(true); setMsg({ type: '', text: '' });
        try {
            const optRes = await API.get(`/api/webauthn/register-options?citizenId=${citizenId}`);
            const credential = await startRegistration(optRes.data);
            await API.post('/api/webauthn/register-verify', { citizenId, credential });
            setMsg({ type: 'success', text: 'New device key registered successfully.' });
            loadKeys();
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setMsg({ type: 'error', text: 'Registration was cancelled.' });
            } else {
                setMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to register key.' });
            }
        } finally { setAdding(false); }
    };

    const handleRemoveKey = async (credentialId) => {
        setMsg({ type: '', text: '' });
        try {
            await API.delete(`/api/webauthn/key/${encodeURIComponent(credentialId)}`);
            setMsg({ type: 'success', text: 'Device key removed.' });
            loadKeys();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to remove key.' });
        }
    };

    const cardStyle = {
        background: theme.bgCard, borderRadius: 12,
        border: `1px solid ${theme.border}`, padding: 24
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Settings
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Manage your device keys and security preferences
                </p>
            </div>

            {msg.text && (
                <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
                    background: msg.type === 'success' ? `${theme.success}15` : `${theme.danger}15`,
                    border: `1px solid ${msg.type === 'success' ? theme.success : theme.danger}30`,
                    color: msg.type === 'success' ? theme.success : theme.danger,
                }}>
                    {msg.text}
                </div>
            )}

            {/* Device Keys section */}
            <div style={cardStyle}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: theme.accentGlow, padding: 8, borderRadius: 8 }}>
                            <KeyRound size={18} color={theme.accent} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                                Device Keys
                            </div>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                                FIDO2 passkeys used to sign in
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAddKey}
                        disabled={adding}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            background: theme.accentGlow, border: `1px solid ${theme.accent}40`,
                            borderRadius: 8, padding: '8px 14px', color: theme.accent,
                            cursor: 'pointer', fontSize: 13, fontWeight: 600
                        }}>
                        <Plus size={14} />
                        {adding ? 'Registering...' : 'Add Device Key'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                        Loading keys...
                    </div>
                ) : keys.length === 0 ? (
                    <div style={{
                        padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13,
                        border: `1px dashed ${theme.border}`, borderRadius: 8
                    }}>
                        No device keys registered. Add one to enable passwordless login.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {keys.map((k, i) => (
                            <div key={k.credentialId} style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                background: theme.bg, borderRadius: 10,
                                border: `1px solid ${theme.borderLight}`,
                                padding: '14px 16px'
                            }}>
                                <div style={{
                                    background: `${theme.success}15`, padding: 8,
                                    borderRadius: 8, flexShrink: 0
                                }}>
                                    <ShieldCheck size={16} color={theme.success} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>
                                        Device Key {i + 1}
                                    </div>
                                    <div style={{
                                        fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono,
                                        marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', maxWidth: 280
                                    }}>
                                        {k.credentialId}
                                    </div>
                                    <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 3 }}>
                                        Registered {new Date(k.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveKey(k.credentialId)}
                                    disabled={keys.length === 1}
                                    title={keys.length === 1 ? 'Cannot remove the only key' : 'Remove key'}
                                    style={{
                                        background: keys.length === 1 ? 'transparent' : `${theme.danger}15`,
                                        border: `1px solid ${keys.length === 1 ? theme.borderLight : theme.danger}30`,
                                        borderRadius: 7, padding: '7px 10px',
                                        color: keys.length === 1 ? theme.textMuted : theme.danger,
                                        cursor: keys.length === 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        fontSize: 12, fontWeight: 600
                                    }}>
                                    <Trash2 size={13} />
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{
                    marginTop: 16, padding: '12px 14px',
                    background: `${theme.accent}08`, border: `1px solid ${theme.border}`,
                    borderRadius: 8, fontSize: 12, color: theme.textMuted, lineHeight: 1.6
                }}>
                    <strong style={{ color: theme.textSecondary }}>Tip:</strong> Register a device key on each device you want to use for sign-in.
                    Your private key never leaves the device — only a public key is stored on the server.
                </div>
            </div>
        </div>
    );
}
