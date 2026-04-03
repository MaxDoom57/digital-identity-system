import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';

export default function MyIdentity() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('identity');

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const res = await API.get('/api/citizen/profile');
            setProfile(res.data);
        } catch { } finally { setLoading(false); }
    };

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 200, color: theme.textMuted, fontSize: 14
        }}>
            Loading identity data...
        </div>
    );

    const citizen = profile?.citizen;
    const orgRecords = profile?.orgRecords || [];
    const blockchainData = profile?.blockchainData;

    if (!citizen || citizen.status !== 'APPROVED') {
        return (
            <div style={{
                background: theme.bgCard, borderRadius: 12,
                border: `1px solid ${theme.border}`, padding: 40, textAlign: 'center'
            }}>
                <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                    Your identity is not yet approved.
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>
                    Status: {citizen?.status || 'Unknown'}
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'identity', label: 'Identity Card' },
        { id: 'blockchain', label: 'Blockchain Record' },
        { id: 'records', label: `Organization Records (${orgRecords.length})` },
    ];

    const downloadQR = () => {
        if (!citizen.qrCode) return;
        const a = document.createElement('a');
        a.href = citizen.qrCode;
        a.download = `${citizen.citizenId}_qr.png`;
        a.click();
    };

    const cardField = (label, value, mono = false) => (
        <div style={{
            padding: '12px 0', borderBottom: `1px solid ${theme.borderLight}`,
            display: 'flex', gap: 16, alignItems: 'flex-start'
        }}>
            <div style={{
                fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
                letterSpacing: '0.08em', width: 120, flexShrink: 0, paddingTop: 2
            }}>{label}</div>
            <div style={{
                fontSize: 13, color: theme.textPrimary, fontWeight: 500,
                fontFamily: mono ? theme.fontMono : 'inherit', wordBreak: 'break-all'
            }}>
                {value || '—'}
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                    Digital Identity
                </h1>
                <p style={{ fontSize: 13, color: theme.textSecondary }}>
                    Your verified decentralized identity on Hyperledger Fabric
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 24,
                background: theme.bgCard, borderRadius: 10, padding: 4,
                border: `1px solid ${theme.border}`, width: 'fit-content'
            }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 18px', borderRadius: 7, border: 'none',
                            cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            background: activeTab === tab.id ? theme.accent : 'transparent',
                            color: activeTab === tab.id ? 'white' : theme.textSecondary,
                            transition: 'all 0.15s'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Identity Card Tab */}
            {activeTab === 'identity' && (
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
                    {/* QR Card */}
                    <div style={{
                        background: `linear-gradient(160deg, #0d1f3c 0%, #0a1628 100%)`,
                        borderRadius: 16, border: `1px solid ${theme.border}`, padding: 28,
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: 11, color: theme.accent, fontWeight: 600,
                            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20,
                            alignSelf: 'flex-start'
                        }}>
                            Sri Lanka Digital ID
                        </div>

                        {/* QR Code */}
                        <div style={{
                            width: 180, height: 180, background: 'white', borderRadius: 12,
                            padding: 8, marginBottom: 20, display: 'flex', alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {citizen.qrCode ? (
                                <img src={citizen.qrCode} alt="QR Code"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center' }}>
                                    QR not available
                                </div>
                            )}
                        </div>

                        <div style={{
                            fontSize: 16, fontWeight: 700, color: theme.textPrimary,
                            marginBottom: 4, textAlign: 'center'
                        }}>{citizen.fullName}</div>
                        <div style={{
                            fontSize: 12, color: theme.accent, fontFamily: theme.fontMono,
                            marginBottom: 20
                        }}>{citizen.citizenId}</div>

                        <div style={{
                            width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16
                        }}>
                            <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>NIC Number</div>
                            <div style={{
                                fontSize: 13, color: theme.textPrimary,
                                fontFamily: theme.fontMono
                            }}>{citizen.nicNumber}</div>
                        </div>

                        <div style={{
                            width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 20
                        }}>
                            <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>Status</div>
                            <div style={{
                                fontSize: 13, color: theme.success,
                                fontWeight: 600
                            }}>ACTIVE — VERIFIED</div>
                        </div>

                        {citizen.qrCode && (
                            <button onClick={downloadQR}
                                style={{
                                    width: '100%', background: theme.accentGlow,
                                    border: `1px solid ${theme.accent}40`, borderRadius: 8, padding: '10px',
                                    color: theme.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600
                                }}>
                                Download QR Code
                            </button>
                        )}
                    </div>

                    {/* Identity Details */}
                    <div style={{
                        background: theme.bgCard, borderRadius: 16,
                        border: `1px solid ${theme.border}`, padding: 28
                    }}>
                        <div style={{
                            fontSize: 12, fontWeight: 600, color: theme.textMuted,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20
                        }}>
                            Personal Information
                        </div>
                        {cardField('Full Name', citizen.fullName)}
                        {cardField('NIC Number', citizen.nicNumber, true)}
                        {cardField('Date of Birth', citizen.dateOfBirth ?
                            new Date(citizen.dateOfBirth).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'long', year: 'numeric'
                            }) : null)}
                        {cardField('Email', citizen.email)}
                        {cardField('Phone', citizen.phone)}
                        {cardField('Address', citizen.address)}
                        {cardField('Registered', new Date(citizen.createdAt).toLocaleDateString())}

                        <div style={{
                            marginTop: 24, padding: '16px', background: theme.bg,
                            borderRadius: 10, border: `1px solid ${theme.borderLight}`
                        }}>
                            <div style={{
                                fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                                letterSpacing: '0.08em', marginBottom: 8
                            }}>Decentralized Identifier (DID)</div>
                            <div style={{
                                fontFamily: theme.fontMono, fontSize: 12, color: theme.accent,
                                wordBreak: 'break-all', lineHeight: 1.6
                            }}>{citizen.did}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Blockchain Record Tab */}
            {activeTab === 'blockchain' && (
                <div style={{
                    background: theme.bgCard, borderRadius: 16,
                    border: `1px solid ${theme.border}`, padding: 28
                }}>
                    <div style={{
                        fontSize: 12, fontWeight: 600, color: theme.textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: theme.success, boxShadow: `0 0 8px ${theme.success}`
                        }} />
                        Live Blockchain Record — Hyperledger Fabric
                    </div>
                    {blockchainData ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {Object.entries(blockchainData).map(([key, value]) => (
                                <div key={key} style={{
                                    background: theme.bg, borderRadius: 8,
                                    padding: '12px 16px', border: `1px solid ${theme.borderLight}`
                                }}>
                                    <div style={{
                                        fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', marginBottom: 6
                                    }}>{key}</div>
                                    <div style={{
                                        fontSize: 12, color: theme.textPrimary, wordBreak: 'break-all',
                                        fontFamily: ['did', 'biometricHash', 'ipfsCid'].includes(key) ?
                                            theme.fontMono : 'inherit'
                                    }}>
                                        {String(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: theme.textMuted, fontSize: 13 }}>
                            Blockchain data not available
                        </div>
                    )}
                </div>
            )}

            {/* Organization Records Tab */}
            {activeTab === 'records' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {orgRecords.length === 0 ? (
                        <div style={{
                            background: theme.bgCard, borderRadius: 16,
                            border: `1px solid ${theme.border}`, padding: 48, textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                                No organization records yet
                            </div>
                            <div style={{ fontSize: 13, color: theme.textMuted }}>
                                Records added by hospitals, banks, universities, or government agencies will appear here.
                            </div>
                        </div>
                    ) : orgRecords.map(record => (
                        <div key={record.id} style={{
                            background: theme.bgCard, borderRadius: 12,
                            border: `1px solid ${theme.border}`, padding: 24
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', marginBottom: 16
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: 15, fontWeight: 600, color: theme.textPrimary,
                                        marginBottom: 4
                                    }}>{record.recordTitle}</div>
                                    <div style={{
                                        fontSize: 12, color: theme.accent,
                                        fontFamily: theme.fontMono
                                    }}>{record.orgId}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 11, color: theme.accent,
                                        background: theme.accentGlow, padding: '3px 10px', borderRadius: 4,
                                        border: `1px solid ${theme.accent}30`, fontWeight: 600
                                    }}>
                                        {record.recordType}
                                    </span>
                                    <span style={{ fontSize: 11, color: theme.textMuted }}>
                                        {new Date(record.addedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                background: theme.bg, borderRadius: 8, padding: '14px 16px',
                                border: `1px solid ${theme.borderLight}`
                            }}>
                                <div style={{
                                    fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                                    letterSpacing: '0.08em', marginBottom: 8
                                }}>Record Data</div>
                                <div style={{
                                    fontSize: 13, color: theme.textSecondary, fontFamily: theme.fontMono,
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                }}>
                                    {typeof record.recordData === 'string' ? record.recordData : JSON.stringify(record.recordData, null, 2)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
