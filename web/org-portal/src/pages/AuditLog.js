import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Shield, Clock, Hexagon } from 'lucide-react';

function getOrgIdFromToken() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.username || null;
    } catch {
        return null;
    }
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    try { return new Date(ts * 1000).toLocaleString(); } catch { return '—'; }
}

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const orgId = getOrgIdFromToken();
        setLoading(true);
        API.get('/api/admin/audit-all')
            .then(res => {
                const all = Array.isArray(res.data) ? res.data : [];
                const filtered = orgId
                    ? all.filter(log => (log.Value?.orgId || log.Record?.orgId) === orgId)
                    : all;
                setLogs(filtered);
            })
            .catch(() => setError('Failed to load transaction log'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>Node Transaction Log</h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>Real-time view of blockchain activities performed by this organization</p>
            </div>

            {error && (
                <div style={{ background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`, borderRadius: 8, padding: 12, color: theme.danger, fontSize: 13, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            <div style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.02)' }}>
                            {['Tx Hash', 'Activity', 'Timestamp', 'Ledger Status'].map(h => (
                                <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>Querying blockchain ledger...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>No transactions recorded for this organization yet.</td></tr>
                        ) : logs.map((log, i) => {
                            const txId = log.TxID || log.txId || `TX${i}`;
                            const action = log.Value?.action || log.Record?.action || 'BLOCKCHAIN_EVENT';
                            const ts = log.Timestamp || log.Record?.timestamp;
                            return (
                                <tr key={i} style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
                                    <td style={{ padding: '16px 24px', color: theme.accent, fontFamily: theme.fontMono, fontSize: 12 }}>
                                        {txId?.slice(0, 12)}...
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ background: theme.accentGlow, borderRadius: 4, padding: 4 }}><Hexagon size={12} color={theme.accent} /></div>
                                            <span style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 500 }}>{action}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: theme.textSecondary, fontSize: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={14} color={theme.textMuted} /> {formatTimestamp(ts)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Shield size={14} color={theme.success} />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: theme.success }}>COMMITTED</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
