import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Search, User, Shield, Hash, Calendar } from 'lucide-react';

export default function Citizens() {
    const [registrations, setRegistrations] = useState([]);
    const [searchDid, setSearchDid] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { loadCitizens(); }, []);

    const loadCitizens = async () => {
        try {
            const res = await API.get('/api/registration/pending');
            setRegistrations((res.data.registrations || []).filter(r => r.status === 'APPROVED'));
        } catch { }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true); setSearchResult(null); setError('');
        try {
            const did = `did:fabric:${searchDid}`;
            const res = await API.get(`/api/identity/${encodeURIComponent(did)}`);
            if (res.data?.biometricHash) console.log('[DEV] biometricHash for', did, ':', res.data.biometricHash);
            setSearchResult(res.data);
        } catch (err) {
            setError('Identity not found on blockchain');
        } finally { setLoading(false); }
    };

    const cardStyle = {
        background: theme.bgCard, borderRadius: 10,
        border: `1px solid ${theme.border}`, overflow: 'hidden'
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Citizen Registry
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Approved citizens with active decentralized identifiers
                </p>
            </div>

            {/* Blockchain Search */}
            <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
                <div style={{
                    fontSize: 12, color: theme.textMuted, textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600
                }}>
                    Blockchain Identity Lookup
                </div>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: 14,
                            top: '50%', transform: 'translateY(-50%)', color: theme.textMuted
                        }} />
                        <input value={searchDid} onChange={e => setSearchDid(e.target.value)}
                            placeholder="Enter Citizen ID to query blockchain (e.g. CIT001)"
                            style={{
                                background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                                padding: '11px 16px 11px 44px', color: theme.textPrimary, width: '100%',
                                fontSize: 13, fontFamily: theme.fontMono, outline: 'none'
                            }} required />
                    </div>
                    <button type="submit" disabled={loading}
                        style={{
                            background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
                            padding: '0 24px', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap'
                        }}>
                        {loading ? 'Querying...' : 'Query Ledger'}
                    </button>
                </form>
                {error && (
                    <div style={{
                        marginTop: 12, fontSize: 13, color: theme.danger, padding: '10px 14px',
                        background: `${theme.danger}10`, borderRadius: 6, border: `1px solid ${theme.danger}30`
                    }}>
                        {error}
                    </div>
                )}
                {searchResult && (
                    <div style={{
                        marginTop: 16, background: theme.bg, borderRadius: 8,
                        border: `1px solid ${theme.border}`, padding: 20
                    }}>
                        <div style={{
                            fontSize: 12, color: theme.success, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <Shield size={14} /> Identity Verified on Blockchain
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {Object.entries(searchResult)
                                .filter(([k]) => k !== 'biometricHash')
                                .map(([k, v]) => (
                                <div key={k} style={{
                                    padding: '8px 12px', background: theme.bgCard,
                                    borderRadius: 6, border: `1px solid ${theme.borderLight}`
                                }}>
                                    <div style={{
                                        fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                                        letterSpacing: '0.06em', marginBottom: 4
                                    }}>{k}</div>
                                    <div style={{
                                        fontSize: 12, color: theme.textPrimary, wordBreak: 'break-all',
                                        fontFamily: ['did', 'ipfsCid'].includes(k) ? theme.fontMono : 'inherit'
                                    }}>
                                        {String(v)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Citizens Table */}
            <div style={cardStyle}>
                <div style={{
                    padding: '16px 20px', borderBottom: `1px solid ${theme.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{
                        fontSize: 12, color: theme.textMuted, textTransform: 'uppercase',
                        letterSpacing: '0.08em', fontWeight: 600
                    }}>
                        Approved Citizens — {registrations.length} Records
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                            {['Citizen ID', 'Full Name', 'NIC Number', 'DID', 'Registered', 'Status'].map(h => (
                                <th key={h} style={{
                                    padding: '12px 20px', textAlign: 'left', fontSize: 11,
                                    color: theme.textMuted, fontWeight: 600, letterSpacing: '0.08em',
                                    textTransform: 'uppercase'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.length === 0 ? (
                            <tr><td colSpan={6} style={{
                                padding: 40, textAlign: 'center',
                                color: theme.textMuted, fontSize: 13
                            }}>
                                No approved citizens yet
                            </td></tr>
                        ) : registrations.map((r, i) => (
                            <tr key={r.citizenId}
                                style={{
                                    borderBottom: `1px solid ${theme.borderLight}`,
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                }}>
                                <td style={{
                                    padding: '14px 20px', fontSize: 12, color: theme.accent,
                                    fontFamily: theme.fontMono
                                }}>{r.citizenId}</td>
                                <td style={{
                                    padding: '14px 20px', fontSize: 13, color: theme.textPrimary,
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: theme.accentGlow, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={14} color={theme.accent} />
                                    </div>
                                    {r.fullName}
                                </td>
                                <td style={{
                                    padding: '14px 20px', fontSize: 12, color: theme.textSecondary,
                                    fontFamily: theme.fontMono
                                }}>{r.nicNumber}</td>
                                <td style={{
                                    padding: '14px 20px', fontSize: 11, color: theme.textMuted,
                                    fontFamily: theme.fontMono, maxWidth: 180, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {r.did || '—'}
                                </td>
                                <td style={{ padding: '14px 20px', fontSize: 12, color: theme.textMuted }}>
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '14px 20px' }}>
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, color: theme.success,
                                        background: `${theme.success}15`, padding: '3px 10px', borderRadius: 4,
                                        border: `1px solid ${theme.success}30`, letterSpacing: '0.05em'
                                    }}>
                                        ACTIVE
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
