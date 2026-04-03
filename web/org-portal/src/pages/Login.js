import React, { useState } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Lock, Building2, ShieldCheck, ArrowRight } from 'lucide-react';

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
            const res = await API.post('/api/auth/login', { username, password, role: 'organization' });
            onLogin(res.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally { setLoading(false); }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: '12px 16px 12px 42px', color: theme.textPrimary, fontSize: 14, width: '100%',
        outline: 'none'
    };

    return (
        <div style={{
            minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a5f30 0%, transparent 70%)'
        }}>

            <div style={{ width: 400, background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 40 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: theme.accentGlow, padding: 16, borderRadius: 20, marginBottom: 20 }}>
                        <Building2 size={40} color={theme.accent} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>Service Partner</h1>
                    <p style={{ fontSize: 14, color: theme.textSecondary }}>Organization Authentication Portal</p>
                </div>

                {error && <div style={{ background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`, borderRadius: 8, padding: 12, color: theme.danger, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 20, position: 'relative' }}>
                        <Building2 size={18} style={{ position: 'absolute', left: 14, top: 12, color: theme.textMuted }} />
                        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="Organization ID" required />
                    </div>
                    <div style={{ marginBottom: 32, position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: theme.textMuted }} />
                        <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="Access Key" required />
                    </div>
                    <button type="submit" disabled={loading} style={{ width: '100%', background: theme.accent, color: 'white', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                        {loading ? 'Verifying...' : 'Authorize Partner Access'}
                    </button>
                </form>
            </div>
        </div>
    );
}
