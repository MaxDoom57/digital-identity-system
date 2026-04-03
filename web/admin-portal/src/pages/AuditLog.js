import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [citizenId, setCitizenId] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => { loadAllLogs(); }, []);

    const loadAllLogs = async () => {
        setLoading(true);
        try {
            const res = await API.get('/api/admin/audit-all');
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch {
            setLogs([]);
        } finally { setLoading(false); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!citizenId.trim()) { loadAllLogs(); return; }
        setLoading(true); setSearched(true);
        try {
            const res = await API.get(`/api/admin/audit/${citizenId.trim()}`);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch {
            setLogs([]);
        } finally { setLoading(false); }
    };

    const getOperationColor = (action) => {
        if (!action) return theme.textSecondary;
        const a = action.toUpperCase();
        if (a.includes('CREATE') || a.includes('ENROLL')) return theme.success;
        if (a.includes('REVOKE') || a.includes('REJECT')) return theme.danger;
        if (a.includes('VERIFY') || a.includes('ACCESS')) return theme.accent;
        if (a.includes('CONSENT') || a.includes('GRANT')) return '#a78bfa';
        return theme.warning;
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Audit Log Explorer
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Immutable transaction history recorded on Hyperledger Fabric
                </p>
            </div>

            {/* Search */}
            <div style={{
                background: theme.bgCard, borderRadius: 12,
                border: `1px solid ${theme.border}`, padding: 20, marginBottom: 24
            }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <SearchIcon style={{
                            position: 'absolute', left: 14,
                            top: '50%', transform: 'translateY(-50%)', color: theme.textMuted
                        }} />
                        <input value={citizenId} onChange={e => setCitizenId(e.target.value)}
                            placeholder="Filter by Citizen ID (e.g. CIT696484) — leave empty for all transactions"
                            style={{
                                background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                                padding: '11px 16px 11px 44px', color: theme.textPrimary, width: '100%',
                                fontSize: 13, fontFamily: theme.fontMono, outline: 'none', boxSizing: 'border-box'
                            }} />
                    </div>
                    <button type="submit"
                        style={{
                            background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
                            padding: '0 24px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            whiteSpace: 'nowrap'
                        }}>
                        Search
                    </button>
                    <button type="button" onClick={() => { setCitizenId(''); setSearched(false); loadAllLogs(); }}
                        style={{
                            background: theme.bgHover, border: `1px solid ${theme.border}`, borderRadius: 8,
                            padding: '0 16px', color: theme.textSecondary, cursor: 'pointer',
                            fontSize: 13, fontWeight: 500
                        }}>
                        Reset
                    </button>
                </form>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                {[
                    { label: 'Total Transactions', value: logs.length },
                    { label: 'Identity Events', value: logs.filter(l => l.Value?.action?.includes('IDENTITY') || l.Value?.action?.includes('CREATE')).length },
                    { label: 'Access Events', value: logs.filter(l => l.Value?.action?.includes('ACCESS') || l.Value?.action?.includes('VERIFY')).length },
                    { label: 'Consent Events', value: logs.filter(l => l.Value?.action?.includes('CONSENT') || l.Value?.action?.includes('GRANT')).length },
                ].map(s => (
                    <div key={s.label} style={{
                        background: theme.bgCard, border: `1px solid ${theme.border}`,
                        borderRadius: 8, padding: '12px 20px', flex: 1
                    }}>
                        <div style={{
                            fontSize: 22, fontWeight: 700, color: theme.textPrimary,
                            fontFamily: theme.fontMono
                        }}>{s.value}</div>
                        <div style={{
                            fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
                            letterSpacing: '0.06em', marginTop: 2
                        }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{
                background: theme.bgCard, borderRadius: 12,
                border: `1px solid ${theme.border}`, overflow: 'hidden'
            }}>
                <div style={{
                    padding: '14px 20px', borderBottom: `1px solid ${theme.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{
                        fontSize: 12, color: theme.textMuted, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.08em'
                    }}>
                        {loading ? 'Querying Hyperledger Fabric...' :
                            `${logs.length} transaction${logs.length !== 1 ? 's' : ''} found`}
                    </div>
                    <div style={{
                        fontSize: 11, color: theme.success, display: 'flex',
                        alignItems: 'center', gap: 6
                    }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: theme.success, boxShadow: `0 0 6px ${theme.success}`
                        }} />
                        Immutable Ledger
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{
                            borderBottom: `1px solid ${theme.border}`,
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            {['Tx Hash', 'Citizen ID', 'Actor / Org', 'Operation', 'Timestamp', 'State'].map(h => (
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
                            <tr><td colSpan={6} style={{
                                padding: 48, textAlign: 'center',
                                color: theme.textMuted, fontSize: 13
                            }}>
                                Querying blockchain ledger...
                            </td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} style={{
                                padding: 48, textAlign: 'center',
                                color: theme.textMuted, fontSize: 13
                            }}>
                                {searched ? 'No transactions found for this citizen.' :
                                    'No blockchain transactions recorded yet. Approve a citizen registration to generate transactions.'}
                            </td></tr>
                        ) : logs.map((log, i) => {
                            const action = log.Value?.action || log.Record?.action || 'BLOCKCHAIN_EVENT';
                            const txId = log.TxID || log.txId || `TX${i}`;
                            const actor = log.Value?.orgId || log.citizenId || 'SYSTEM';
                            const ts = log.Timestamp || log.Record?.timestamp;
                            const citizenRef = log.citizenId || log.Value?.citizenId || '—';

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
                                        <div style={{
                                            fontFamily: theme.fontMono, fontSize: 12,
                                            color: theme.textSecondary
                                        }}>{citizenRef}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontSize: 12, color: theme.textPrimary }}>{actor}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600,
                                            color: getOperationColor(action),
                                            background: `${getOperationColor(action)}15`,
                                            padding: '3px 10px', borderRadius: 4,
                                            border: `1px solid ${getOperationColor(action)}30`,
                                            letterSpacing: '0.04em'
                                        }}>
                                            {action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontSize: 12, color: theme.textSecondary }}>
                                            {ts ? new Date(ts * 1000).toLocaleString() : '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            fontSize: 11, color: theme.success, fontWeight: 600
                                        }}>
                                            <div style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: theme.success
                                            }} />
                                            COMMITTED
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

const SearchIcon = ({ style }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" style={style}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
