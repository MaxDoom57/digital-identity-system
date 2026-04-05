import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Shield } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [citizens, setCitizens] = useState([]);
    const [loading, setLoading] = useState(true);

    const orgInfo = JSON.parse(localStorage.getItem('orgInfo') || '{}');
    const orgName = orgInfo.orgName || orgInfo.orgId || 'Organization';
    const orgId   = orgInfo.orgId || '—';

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await API.get('/api/orgrecords/citizens');
            setCitizens(res.data.citizens || []);
        } catch { } finally { setLoading(false); }
    };

    const cardStyle = {
        background: theme.bgCard, borderRadius: 12,
        border: `1px solid ${theme.border}`, padding: 24
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ background: theme.accentGlow, color: theme.accent, padding: 10, borderRadius: 10 }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, lineHeight: 1.2 }}>
                            {orgName}
                        </h1>
                        <div style={{ fontSize: 12, color: theme.accent, fontFamily: theme.fontMono }}>
                            {orgId}
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Manage citizen identity records and attestations
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                        letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={12} /> Enrolled Citizens
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: theme.accent }}>
                        {citizens.length}
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                        letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>
                        Connected to Channel
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.success,
                        fontFamily: theme.fontMono }}>
                        identitychannel
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                        letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={12} /> Blockchain Status
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: theme.success }}>Online</div>
                </div>
            </div>

            {/* Recent Citizens */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Enrolled Citizens — {citizens.length}
                    </div>
                    <button onClick={() => navigate('/citizens')}
                        style={{ background: theme.accentGlow, border: `1px solid ${theme.accent}40`,
                            borderRadius: 7, padding: '7px 14px', color: theme.accent,
                            cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        View All
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                        Loading citizens...
                    </div>
                ) : citizens.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                        No citizens enrolled yet. Go to <strong style={{ color: theme.accent }}>My Citizens</strong> to add one.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                {['Citizen ID', 'Full Name', 'NIC Number', 'DID', 'Enrolled', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left',
                                        fontSize: 11, color: theme.textMuted, fontWeight: 600,
                                        letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {citizens.slice(0, 8).map((c, i) => (
                                <tr key={c.citizenId}
                                    style={{ borderBottom: `1px solid ${theme.borderLight}`,
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: theme.accent,
                                        fontFamily: theme.fontMono }}>{c.citizenId}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, color: theme.textPrimary }}>
                                        {c.fullName}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: theme.textSecondary,
                                        fontFamily: theme.fontMono }}>{c.nicNumber}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 11, color: theme.textMuted,
                                        fontFamily: theme.fontMono, maxWidth: 140, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.did || '—'}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 11, color: theme.textMuted }}>
                                        {c.linkedAt ? new Date(c.linkedAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button onClick={() => navigate(`/add-record/${c.citizenId}`)}
                                            style={{ background: theme.accentGlow, border: `1px solid ${theme.accent}40`,
                                                borderRadius: 6, padding: '5px 12px', color: theme.accent,
                                                cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                            Add Record
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
