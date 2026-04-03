import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

export default function OfflineToken() {
    const [state, setState] = useState('idle'); // idle | loading | active | error
    const [tokenData, setTokenData] = useState(null);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const startCountdown = (expiry) => {
        clearInterval(timerRef.current);
        const tick = () => {
            const remaining = expiry - Math.floor(Date.now() / 1000);
            if (remaining <= 0) {
                setTimeLeft(0);
                setState('idle');
                setTokenData(null);
                clearInterval(timerRef.current);
            } else {
                setTimeLeft(remaining);
            }
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    };

    const handleRequest = async () => {
        setState('loading');
        setError('');
        try {
            const res = await API.post('/api/citizen/offline-token');
            setTokenData(res.data);
            setState('active');
            startCountdown(res.data.expiry);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate token');
            setState('error');
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const pct = tokenData ? Math.round((timeLeft / tokenData.validFor) * 100) : 0;
    const timerColor = pct > 50 ? theme.success : pct > 20 ? theme.warning : theme.danger;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>Offline Identity Token</h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>Generate a time-limited QR token to verify your identity without internet access</p>
            </div>

            {state === 'idle' || state === 'error' ? (
                <div style={{
                    background: theme.bgCard, border: `1px solid ${theme.border}`,
                    borderRadius: 12, padding: 40, textAlign: 'center', maxWidth: 480
                }}>
                    <div style={{
                        display: 'inline-flex', background: theme.accentGlow,
                        borderRadius: '50%', padding: 20, marginBottom: 24
                    }}>
                        <QrIcon size={40} color={theme.accent} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary, marginBottom: 8 }}>
                        Request Offline Token
                    </h2>
                    <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 28, lineHeight: 1.6 }}>
                        Your token will be valid for <strong style={{ color: theme.textPrimary }}>24 hours</strong>.
                        Present the QR code to any offline verifier.
                    </p>

                    {error && (
                        <div style={{
                            background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`,
                            borderRadius: 8, padding: 12, color: theme.danger,
                            fontSize: 13, marginBottom: 20
                        }}>
                            {error}
                        </div>
                    )}

                    <button onClick={handleRequest} style={{
                        background: theme.accent, color: '#fff', border: 'none',
                        borderRadius: 8, padding: '12px 32px', fontSize: 14,
                        fontWeight: 600, cursor: 'pointer'
                    }}>
                        Generate Token
                    </button>
                </div>
            ) : state === 'loading' ? (
                <div style={{
                    background: theme.bgCard, border: `1px solid ${theme.border}`,
                    borderRadius: 12, padding: 60, textAlign: 'center', maxWidth: 480
                }}>
                    <div style={{ color: theme.textMuted, fontSize: 13 }}>Generating secure token...</div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {/* QR Card */}
                    <div style={{
                        background: theme.bgCard, border: `1px solid ${theme.border}`,
                        borderRadius: 12, padding: 32, textAlign: 'center', flexShrink: 0
                    }}>
                        <div style={{
                            fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
                            letterSpacing: '0.08em', marginBottom: 16
                        }}>Scan to Verify</div>
                        <div style={{
                            background: '#fff', borderRadius: 8, padding: 8,
                            display: 'inline-block', marginBottom: 16
                        }}>
                            <img
                                src={tokenData.qrCode}
                                alt="Offline identity QR code"
                                style={{ width: 200, height: 200, display: 'block' }}
                            />
                        </div>
                        <div style={{
                            fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono,
                            wordBreak: 'break-all', maxWidth: 216, margin: '0 auto'
                        }}>
                            {tokenData.token.slice(0, 32)}…
                        </div>
                    </div>

                    {/* Timer + Info Card */}
                    <div style={{
                        background: theme.bgCard, border: `1px solid ${theme.border}`,
                        borderRadius: 12, padding: 32, flex: 1, minWidth: 260
                    }}>
                        <div style={{
                            fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
                            letterSpacing: '0.08em', marginBottom: 20
                        }}>Token Status</div>

                        {/* Countdown */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{
                                fontSize: 40, fontWeight: 700, fontFamily: theme.fontMono,
                                color: timerColor, letterSpacing: '0.05em', marginBottom: 8
                            }}>
                                {formatTime(timeLeft)}
                            </div>
                            <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                                Time remaining
                            </div>
                            {/* Progress bar */}
                            <div style={{
                                height: 6, background: theme.border, borderRadius: 3, overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', width: `${pct}%`,
                                    background: timerColor, borderRadius: 3,
                                    transition: 'width 1s linear, background 0.5s'
                                }} />
                            </div>
                        </div>

                        <div style={{
                            background: `${theme.success}10`, border: `1px solid ${theme.success}30`,
                            borderRadius: 8, padding: '10px 14px',
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20
                        }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%', background: theme.success,
                                flexShrink: 0
                            }} />
                            <span style={{ fontSize: 12, color: theme.success, fontWeight: 600 }}>
                                Token Active — Valid offline
                            </span>
                        </div>

                        <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }}>
                            Expires at
                        </div>
                        <div style={{ fontSize: 13, color: theme.textPrimary, fontFamily: theme.fontMono, marginBottom: 24 }}>
                            {new Date(tokenData.expiry * 1000).toLocaleString()}
                        </div>

                        <button onClick={() => { setState('idle'); setTokenData(null); clearInterval(timerRef.current); }} style={{
                            background: 'transparent', border: `1px solid ${theme.border}`,
                            borderRadius: 8, padding: '8px 20px', color: theme.textSecondary,
                            fontSize: 13, cursor: 'pointer', fontWeight: 500
                        }}>
                            Revoke &amp; Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const QrIcon = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h2v2h-2zM18 14h3M14 18h3M18 18v3" />
    </svg>
);
