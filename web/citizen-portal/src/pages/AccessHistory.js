import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

const ACTION_COLOR = (action) => {
    if (!action) return theme.textSecondary;
    const a = action.toUpperCase();
    if (a.includes('ACCESS') || a.includes('VERIFY')) return theme.accent;
    if (a.includes('CONSENT') || a.includes('GRANT')) return '#a78bfa';
    if (a.includes('REVOKE') || a.includes('REJECT')) return theme.danger;
    if (a.includes('CREATE') || a.includes('ENROLL')) return theme.success;
    return theme.warning;
};

function formatTimestamp(ts) {
    if (!ts) return '—';
    try { return new Date(ts * 1000).toLocaleString(); } catch { return '—'; }
}

export default function AccessHistory() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const citizenId = JSON.parse(localStorage.getItem('citizenData') || '{}').citizenId;

    useEffect(() => {
        if (!citizenId) { setLoading(false); return; }
        API.get(`/api/admin/audit/${citizenId}`)
            .then(res => setLogs(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError('Failed to load access history'))
            .finally(() => setLoading(false));
    }, [citizenId]);

    const accessCount = logs.filter(l => {
        const a = (l.Value?.action || '').toUpperCase();
        return a.includes('ACCESS') || a.includes('VERIFY');
    }).length;
    const consentCount = logs.filter(l => {
        const a = (l.Value?.action || '').toUpperCase();
        return a.includes('CONSENT') || a.includes('GRANT');
    }).length;
    const uniqueOrgs = new Set(logs.map(l => l.Value?.orgId).filter(Boolean)).size;

    const cardStyle = { background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}` };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>Access History</h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Immutable record of every organization that accessed your identity data on the blockchain
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Events', value: logs.length, color: theme.textPrimary },
                    { label: 'Access / Verifications', value: accessCount, color: theme.accent },
                    { label: 'Organizations', value: uniqueOrgs, color: theme.warning },
                ].map(s => (
                    <div key={s.label} style={{ ...cardStyle, padding: '20px 24px' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: theme.fontMono }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={cardStyle}>
                <div style={{
                    padding: '14px 20px', borderBottom: `1px solid ${theme.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {loading ? 'Querying Hyperledger Fabric...' : `${logs.length} event${logs.length !== 1 ? 's' : ''}`}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.success, fontWeight: 600 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.success, boxShadow: `0 0 6px ${theme.success}` }} />
                        Immutable Ledger
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.02)' }}>
                            {['Tx Hash', 'Organization', 'Event', 'Fields Accessed', 'Timestamp'].map(h => (
                                <th key={h} style={{
                                    padding: '12px 20px', textAlign: 'left', fontSize: 11,
                                    color: theme.textMuted, fontWeight: 600, letterSpacing: '0.08em',
                                    textTransform: 'uppercase'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                Querying blockchain ledger...
                            </td></tr>
                        ) : error ? (
                            <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: theme.danger, fontSize: 13 }}>
                                {error}
                            </td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                                No access events recorded yet. Your identity history will appear here once organizations interact with your data.
                            </td></tr>
                        ) : logs.map((log, i) => {
                            const txId = log.TxID || log.txId || `TX${i}`;
                            const action = log.Value?.action || log.Record?.action || 'BLOCKCHAIN_EVENT';
                            const orgId = log.Value?.orgId || log.Record?.orgId || '—';
                            const fields = log.Value?.fields || log.Record?.fields;
                            const ts = log.Timestamp || log.Record?.timestamp;
                            const actionColor = ACTION_COLOR(action);

                            return (
                                <tr key={i} style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontFamily: theme.fontMono, fontSize: 11, color: theme.accent }}>
                                            {txId?.slice(0, 12)}...
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 500 }}>{orgId}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, color: actionColor,
                                            background: `${actionColor}15`, padding: '3px 10px',
                                            borderRadius: 4, border: `1px solid ${actionColor}30`,
                                            letterSpacing: '0.04em'
                                        }}>
                                            {action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        {Array.isArray(fields) && fields.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {fields.map(f => (
                                                    <span key={f} style={{
                                                        fontSize: 11, color: theme.accent,
                                                        background: theme.accentGlow, padding: '2px 8px',
                                                        borderRadius: 4, border: `1px solid ${theme.accent}30`
                                                    }}>{f}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: 12, color: theme.textMuted }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontSize: 12, color: theme.textSecondary }}>{formatTimestamp(ts)}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Consent reminder */}
            {!loading && consentCount > 0 && (
                <div style={{
                    marginTop: 16, padding: '12px 16px', borderRadius: 8, fontSize: 13,
                    background: `${theme.accent}08`, border: `1px solid ${theme.accent}20`,
                    color: theme.textSecondary
                }}>
                    <span style={{ color: theme.accent, fontWeight: 600 }}>{consentCount} consent event{consentCount !== 1 ? 's' : ''}</span> recorded.
                    Manage your active consents in the <a href="/consent" style={{ color: theme.accent, textDecoration: 'none', fontWeight: 600 }}>Consent Manager</a>.
                </div>
            )}
        </div>
    );
}
