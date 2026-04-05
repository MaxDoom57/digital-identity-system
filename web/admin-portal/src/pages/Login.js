import React, { useState } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Lock, User, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/api/auth/login', { username, password, role: 'admin' });
            onLogin(res.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally { setLoading(false); }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: '12px 16px 12px 42px', color: theme.textPrimary, fontSize: 14, width: '100%',
        transition: 'border-color 0.2s', outline: 'none'
    };

    return (
        <div style={{
            minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a5f30 0%, transparent 70%)'
        }}>

            <div style={{
                width: 400, background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
                padding: 40, boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)'
            }}>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: theme.accentGlow, padding: 16, borderRadius: 20, marginBottom: 20 }}>
                        <ShieldCheck size={40} color={theme.accent} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>Admin Portal</h1>
                    <p style={{ fontSize: 14, color: theme.textSecondary }}>National Digital Identity Infrastructure</p>
                </div>

                {error && (
                    <div style={{
                        background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`, borderRadius: 8,
                        padding: '12px', color: theme.danger, fontSize: 13, textAlign: 'center', marginBottom: 20
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: 14, top: 12, color: theme.textMuted }} />
                        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="Administrator ID" required />
                    </div>

                    <div style={{ marginBottom: 12, position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: theme.textMuted }} />
                        <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="Access Key" required />
                    </div>

                    {/* Credential hint for development */}
                    <div style={{
                        marginBottom: 28, padding: '10px 14px',
                        background: `${theme.accent}08`, border: `1px solid ${theme.border}`,
                        borderRadius: 8, fontSize: 11, color: theme.textMuted,
                        display: 'flex', justifyContent: 'space-between'
                    }}>
                        <span>ID: <span style={{ fontFamily: theme.fontMono, color: theme.textSecondary }}>admin</span></span>
                        <span style={{ color: theme.borderLight }}>|</span>
                        <span>Key: <span style={{ fontFamily: theme.fontMono, color: theme.textSecondary }}>Admin@2025</span></span>
                    </div>

                    <button type="submit" disabled={loading}
                        style={{
                            width: '100%', background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
                            padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: `0 8px 16px -4px ${theme.accent}40`
                        }}>
                        {loading ? 'Authenticating...' : 'Authorize Access'}
                    </button>
                </form>

                <div style={{ marginTop: 32, textAlign: 'center', borderTop: `1px solid ${theme.borderLight}`, paddingTop: 24 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Secured by Hyperledger Fabric
                    </div>
                </div>
            </div>
        </div>
    );
}
