import React, { useState } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SetupPassword({ onComplete }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const rules = [
        { label: 'At least 8 characters', ok: newPassword.length >= 8 },
        { label: 'Contains a number', ok: /\d/.test(newPassword) },
        { label: 'Passwords match', ok: newPassword.length > 0 && newPassword === confirm },
    ];
    const allOk = rules.every(r => r.ok);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allOk) return;
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/api/auth/org/change-password', { newPassword });
            // Replace token with the fresh one that has mustChangePassword = false
            localStorage.setItem('token', res.data.token);
            onComplete(res.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '12px 44px 12px 44px',
        color: theme.textPrimary,
        fontSize: 14,
        width: '100%',
        outline: 'none',
        boxSizing: 'border-box',
    };

    return (
        <div style={{
            minHeight: '100vh', background: theme.bg, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a5f30 0%, transparent 70%)'
        }}>
            <div style={{ width: 440, background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 40 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: theme.accentGlow, padding: 16, borderRadius: 20, marginBottom: 20 }}>
                        <ShieldCheck size={40} color={theme.accent} />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>
                        Set Your Access Key
                    </h1>
                    <p style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
                        Your account was created with a temporary key.<br />
                        Please set a secure password to continue.
                    </p>
                </div>

                {/* One-time notice */}
                <div style={{
                    background: `${theme.warning}12`, border: `1px solid ${theme.warning}30`,
                    borderRadius: 8, padding: '10px 14px', marginBottom: 24,
                    fontSize: 12, color: theme.warning, display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <Lock size={13} /> This screen appears only once — on first login.
                </div>

                {error && (
                    <div style={{
                        background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`,
                        borderRadius: 8, padding: 12, color: theme.danger,
                        fontSize: 13, marginBottom: 20
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* New password */}
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: 11, color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} />
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={inputStyle}
                                placeholder="Enter new password"
                                required
                            />
                            <button type="button" onClick={() => setShowNew(v => !v)}
                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 0 }}>
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password */}
                    <div style={{ marginBottom: 20, position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: 11, color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Confirm Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} />
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                style={inputStyle}
                                placeholder="Confirm new password"
                                required
                            />
                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 0 }}>
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Password rules */}
                    <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rules.map(r => (
                            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <CheckCircle size={13} color={r.ok ? theme.success : theme.textMuted} />
                                <span style={{ color: r.ok ? theme.success : theme.textMuted }}>{r.label}</span>
                            </div>
                        ))}
                    </div>

                    <button type="submit" disabled={!allOk || loading}
                        style={{
                            width: '100%', background: allOk ? theme.accent : theme.bgHover,
                            color: allOk ? 'white' : theme.textMuted,
                            border: 'none', borderRadius: 8, padding: 14,
                            fontSize: 15, fontWeight: 600, cursor: allOk ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}>
                        {loading ? 'Saving...' : 'Set Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
