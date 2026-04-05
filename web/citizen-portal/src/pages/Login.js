import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api';
import { theme } from '../styles/theme';
import { Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/api/citizen/login', { email, password });
            onLogin(res.data.token, res.data.citizen);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally { setLoading(false); }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: '12px 16px 12px 42px', color: theme.textPrimary, fontSize: 14, width: '100%',
        outline: 'none', transition: 'border-color 0.2s'
    };

    return (
        <div style={{
            minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a5f30 0%, transparent 70%)'
        }}>

            <div style={{ width: 420, background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 40, boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: theme.accentGlow, padding: 16, borderRadius: 20, marginBottom: 20 }}>
                        <ShieldCheck size={40} color={theme.accent} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>My Identity</h1>
                    <p style={{ fontSize: 14, color: theme.textSecondary }}>Sri Lanka Digital Identity Citizen Portal</p>
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
                    <div style={{ marginBottom: 20, position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: 14, top: 13, color: theme.textMuted }} />
                        <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required />
                    </div>

                    <div style={{ marginBottom: 32, position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 13, color: theme.textMuted }} />
                        <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                    </div>

                    <button type="submit" disabled={loading}
                        style={{
                            width: '100%', background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
                            padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}>
                        {loading ? 'Authenticating...' : <>Sign In <ArrowRight size={18} /></>}
                    </button>
                </form>

                <div style={{ marginTop: 32, textAlign: 'center', borderTop: `1px solid ${theme.borderLight}`, paddingTop: 24 }}>
                    <p style={{ fontSize: 14, color: theme.textSecondary }}>
                        Need a digital identity? <Link to="/register" style={{ color: theme.accent, textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
