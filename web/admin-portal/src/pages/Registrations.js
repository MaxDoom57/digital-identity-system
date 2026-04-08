import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

const Badge = ({ status }) => {
    const colors = {
        PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pending' },
        APPROVED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Approved' },
        REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Rejected' },
    };
    const s = colors[status] || colors.PENDING;
    return (
        <span style={{
            background: s.bg, color: s.color, padding: '3px 10px',
            borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
            textTransform: 'uppercase', border: `1px solid ${s.color}30`
        }}>
            {s.label}
        </span>
    );
};

export default function Registrations() {
    const [registrations, setRegistrations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [msg, setMsg] = useState('');

    useEffect(() => { loadRegistrations(); }, []);

    const loadRegistrations = async () => {
        try {
            const res = await API.get('/api/registration/pending');
            setRegistrations(res.data.registrations || []);
        } catch { }
    };

    const handleApprove = async (citizenId) => {
        setLoading(true);
        try {
            await API.post(`/api/registration/approve/${citizenId}`);
            setMsg('Registration approved. DID created on blockchain.');
            setSelected(null);
            loadRegistrations();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Error');
        } finally { setLoading(false); }
    };

    const handleReject = async (citizenId) => {
        if (!rejectReason) { setMsg('Please provide a rejection reason.'); return; }
        setLoading(true);
        try {
            await API.post(`/api/registration/reject/${citizenId}`, { reason: rejectReason });
            setMsg('Registration rejected.');
            setSelected(null);
            setRejectReason('');
            loadRegistrations();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Error');
        } finally { setLoading(false); }
    };

    const filtered = filter === 'ALL' ? registrations : registrations.filter(r => r.status === filter);

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`,
        borderRadius: 6, padding: '8px 12px', color: theme.textPrimary,
        fontSize: 13, width: '100%', fontFamily: theme.fontFamily
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Citizen Registrations
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Review and approve citizen identity registration requests
                </p>
            </div>

            {msg && (
                <div style={{
                    background: 'rgba(14,165,233,0.1)', border: `1px solid ${theme.accent}40`,
                    borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: theme.accent
                }}>
                    {msg}
                    <button onClick={() => setMsg('')} style={{
                        float: 'right', background: 'none',
                        border: 'none', color: theme.accent, cursor: 'pointer'
                    }}>x</button>
                </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{
                            padding: '7px 16px', borderRadius: 6, border: `1px solid ${filter === f ? theme.accent : theme.border}`,
                            background: filter === f ? theme.accentGlow : 'transparent',
                            color: filter === f ? theme.accent : theme.textSecondary,
                            cursor: 'pointer', fontSize: 12, fontWeight: 500, letterSpacing: '0.05em'
                        }}>
                        {f}
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                            ({f === 'ALL' ? registrations.length : registrations.filter(r => r.status === f).length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: theme.bgCard, borderRadius: 10, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                            {['Citizen ID', 'Full Name', 'NIC Number', 'Email', 'Submitted', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{
                                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                                    color: theme.textMuted, fontWeight: 600, letterSpacing: '0.08em',
                                    textTransform: 'uppercase'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                No registrations found
                            </td></tr>
                        ) : filtered.map((r, i) => (
                            <tr key={r.citizenId} style={{
                                borderBottom: `1px solid ${theme.borderLight}`,
                                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                            }}>
                                <td style={{
                                    padding: '12px 16px', fontSize: 12, color: theme.accent,
                                    fontFamily: theme.fontMono
                                }}>{r.citizenId}</td>
                                <td style={{ padding: '12px 16px', fontSize: 13, color: theme.textPrimary }}>{r.fullName}</td>
                                <td style={{
                                    padding: '12px 16px', fontSize: 12, color: theme.textSecondary,
                                    fontFamily: theme.fontMono
                                }}>{r.nicNumber}</td>
                                <td style={{ padding: '12px 16px', fontSize: 12, color: theme.textSecondary }}>{r.email}</td>
                                <td style={{ padding: '12px 16px', fontSize: 11, color: theme.textMuted }}>
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '12px 16px' }}><Badge status={r.status} /></td>
                                <td style={{ padding: '12px 16px' }}>
                                    <button onClick={() => { setSelected(r); if (r.biometricHash) console.log('[DEV] biometricHash for', r.citizenId, ':', r.biometricHash); }}
                                        style={{
                                            padding: '5px 12px', borderRadius: 5, border: `1px solid ${theme.border}`,
                                            background: 'transparent', color: theme.textSecondary, cursor: 'pointer',
                                            fontSize: 11, fontWeight: 500
                                        }}>
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selected && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
                        padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>Registration Review</h2>
                            <button onClick={() => setSelected(null)}
                                style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: 18 }}>x</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                            {[
                                ['Citizen ID', selected.citizenId],
                                ['Full Name', selected.fullName],
                                ['NIC Number', selected.nicNumber],
                                ['Date of Birth', selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : '-'],
                                ['Email', selected.email],
                                ['Phone', selected.phone || '-'],
                                ['Address', selected.address || '-'],
                                ['Status', selected.status],
                            ].map(([label, value]) => (
                                <div key={label} style={{
                                    display: 'flex', gap: 12, padding: '8px 0',
                                    borderBottom: `1px solid ${theme.borderLight}`
                                }}>
                                    <span style={{ fontSize: 12, color: theme.textMuted, width: 120, flexShrink: 0 }}>{label}</span>
                                    <span style={{ fontSize: 13, color: theme.textPrimary }}>{value}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
                                <span style={{ fontSize: 12, color: theme.textMuted, width: 120, flexShrink: 0 }}>Biometric</span>
                                <span style={{ fontSize: 12, color: selected.biometricHash ? theme.success : theme.warning }}>
                                    {selected.biometricHash ? '✓ Enrolled' : 'Not enrolled'}
                                </span>
                            </div>
                        </div>

                        {selected.status === 'PENDING' && (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontSize: 12, color: theme.textSecondary, display: 'block', marginBottom: 6 }}>
                                        Rejection Reason (required if rejecting)
                                    </label>
                                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                        rows={3} placeholder="Enter reason for rejection..."
                                        style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => handleApprove(selected.citizenId)} disabled={loading}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 7, border: 'none',
                                            background: theme.success, color: 'white', cursor: 'pointer',
                                            fontWeight: 600, fontSize: 13
                                        }}>
                                        {loading ? 'Processing...' : 'Approve & Create DID'}
                                    </button>
                                    <button onClick={() => handleReject(selected.citizenId)} disabled={loading}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 7, border: 'none',
                                            background: theme.danger, color: 'white', cursor: 'pointer',
                                            fontWeight: 600, fontSize: 13
                                        }}>
                                        Reject
                                    </button>
                                </div>
                            </>
                        )}
                        {selected.status !== 'PENDING' && (
                            <div style={{
                                background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16,
                                fontSize: 13, color: theme.textSecondary
                            }}>
                                This registration has already been {selected.status.toLowerCase()}.
                                {selected.did && <div style={{
                                    marginTop: 8, color: theme.accent,
                                    fontFamily: theme.fontMono, fontSize: 12
                                }}>DID: {selected.did}</div>}
                                {selected.rejectionReason && <div style={{ marginTop: 8, color: theme.danger }}>
                                    Reason: {selected.rejectionReason}</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
