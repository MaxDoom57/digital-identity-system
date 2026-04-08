import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

export default function Dashboard({ citizenData }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const res = await API.get('/api/citizen/profile');
            setProfile(res.data);
        } catch (err) {
            if (err.response?.status === 404) {
                // Citizen record not in DB — stale token, clear and go to login
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } finally { setLoading(false); }
    };

    const status = profile?.citizen?.status || citizenData?.status || 'PENDING';
    const notifications = profile?.notifications || [];
    const orgRecords = profile?.orgRecords || [];
    const unread = notifications.filter(n => !n.isRead);

    const markRead = async () => {
        try {
            await API.put('/api/citizen/notifications/read');
            loadProfile();
        } catch { }
    };

    const statusConfig = {
        APPROVED: { color: theme.success, bg: `${theme.success}12`, label: 'Identity Active', desc: 'Your decentralized identity is active on the blockchain.' },
        PENDING: { color: theme.warning, bg: `${theme.warning}12`, label: 'Pending Review', desc: 'Your application is under administrator review.' },
        REJECTED: { color: theme.danger, bg: `${theme.danger}12`, label: 'Application Rejected', desc: profile?.citizen?.rejectionReason || 'Your application was not approved.' },
    };
    const sc = statusConfig[status] || statusConfig.PENDING;

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, color: theme.textMuted, fontSize: 14
        }}>
            Loading your identity data...
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Welcome, {profile?.citizen?.fullName || citizenData?.fullName}
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Your digital identity dashboard
                </p>
            </div>

            {/* Status Card */}
            <div style={{
                background: sc.bg, border: `1px solid ${sc.color}30`, borderRadius: 12,
                padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: `${sc.color}15`
                    }}>
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%', background: sc.color,
                            boxShadow: status === 'APPROVED' ? `0 0 12px ${sc.color}` : 'none'
                        }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: sc.color, marginBottom: 4 }}>
                            {sc.label}
                        </div>
                        <div style={{ fontSize: 13, color: theme.textSecondary }}>{sc.desc}</div>
                    </div>
                </div>
                {status === 'REJECTED' && (
                    <a href="/register" style={{
                        background: theme.danger, color: 'white',
                        padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
                        fontSize: 13, fontWeight: 600
                    }}>
                        Retry Registration
                    </a>
                )}
            </div>

            {status === 'APPROVED' && (
                <>
                    {/* DID Card */}
                    <div style={{
                        background: theme.bgCard, border: `1px solid ${theme.border}`,
                        borderRadius: 12, padding: 24, marginBottom: 24
                    }}>
                        <div style={{
                            fontSize: 12, color: theme.textMuted, textTransform: 'uppercase',
                            letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600
                        }}>
                            Decentralized Identifier
                        </div>
                        <div style={{
                            fontFamily: theme.fontMono, fontSize: 14, color: theme.accent,
                            background: theme.bg, padding: '12px 16px', borderRadius: 8,
                            border: `1px solid ${theme.borderLight}`, wordBreak: 'break-all'
                        }}>
                            {profile?.citizen?.did || citizenData?.did}
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Organization Records', value: orgRecords.length },
                            { label: 'Notifications', value: notifications.length },
                            { label: 'Unread Alerts', value: unread.length },
                        ].map(s => (
                            <div key={s.label} style={{
                                background: theme.bgCard,
                                border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20
                            }}>
                                <div style={{
                                    fontSize: 28, fontWeight: 700, color: theme.textPrimary,
                                    fontFamily: theme.fontMono, marginBottom: 4
                                }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: theme.textSecondary }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Notifications */}
            {notifications.length > 0 && (
                <div style={{
                    background: theme.bgCard, border: `1px solid ${theme.border}`,
                    borderRadius: 12, overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '16px 20px', borderBottom: `1px solid ${theme.border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: 12, fontWeight: 600, color: theme.textMuted,
                            textTransform: 'uppercase', letterSpacing: '0.08em'
                        }}>
                            Notifications {unread.length > 0 && (
                                <span style={{
                                    background: theme.danger, color: 'white', borderRadius: 10,
                                    padding: '1px 7px', fontSize: 11, marginLeft: 8
                                }}>{unread.length}</span>
                            )}
                        </div>
                        {unread.length > 0 && (
                            <button onClick={markRead}
                                style={{
                                    background: 'none', border: 'none', color: theme.accent,
                                    cursor: 'pointer', fontSize: 12
                                }}>
                                Mark all read
                            </button>
                        )}
                    </div>
                    {notifications.slice(0, 5).map((n, i) => (
                        <div key={n.id} style={{
                            padding: '16px 20px',
                            borderBottom: i < notifications.length - 1 ? `1px solid ${theme.borderLight}` : 'none',
                            background: !n.isRead ? `${theme.accent}05` : 'transparent'
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', gap: 12
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: 14, fontWeight: !n.isRead ? 600 : 400,
                                        color: theme.textPrimary, marginBottom: 4
                                    }}>{n.title}</div>
                                    <div style={{ fontSize: 13, color: theme.textSecondary }}>{n.message}</div>
                                </div>
                                <div style={{ fontSize: 11, color: theme.textMuted, whiteSpace: 'nowrap' }}>
                                    {new Date(n.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
