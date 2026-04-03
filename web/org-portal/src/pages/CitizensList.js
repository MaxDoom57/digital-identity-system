import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { theme } from '../styles/theme';
import { User, Shield, Search, PlusCircle, ArrowUpRight } from 'lucide-react';

export default function CitizensList() {
    const navigate = useNavigate();
    const [citizens, setCitizens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadCitizens(); }, []);

    const loadCitizens = async () => {
        try {
            const res = await API.get('/api/orgrecords/citizens');
            setCitizens(res.data.citizens || []);
        } catch { } finally { setLoading(false); }
    };

    const filtered = citizens.filter(c =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.nicNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.citizenId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>Verified Citizens</h1>
                    <p style={{ fontSize: 13, color: theme.textSecondary }}>Access citizen records based on granted identity permissions</p>
                </div>
            </div>

            <div style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, padding: 20, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }} />
                    <input
                        style={{
                            background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '12px 16px 12px 48px',
                            color: theme.textPrimary, width: '100%', fontSize: 14
                        }}
                        placeholder="Search by Name, NIC, or Citizen ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {loading ? (
                    <div style={{ color: theme.textMuted }}>Loading registry...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ color: theme.textMuted }}>No linked citizens found</div>
                ) : filtered.map(c => (
                    <div key={c.citizenId} style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, padding: 24, transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ background: theme.accentGlow, color: theme.accent, padding: 12, borderRadius: 12 }}><User size={24} /></div>
                            <div style={{ fontSize: 10, background: `${theme.success}15`, color: theme.success, px: 8, py: 2, padding: '2px 8px', borderRadius: 4, fontWeight: 700, height: 'fit-content' }}>VERIFIED</div>
                        </div>

                        <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>{c.fullName}</h3>
                        <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono, marginBottom: 16 }}>{c.citizenId}</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            <div style={{ fontSize: 13, color: theme.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
                                <span>NIC Number</span>
                                <span style={{ color: theme.textPrimary, fontWeight: 500 }}>{c.nicNumber}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => navigate(`/add-record/${c.citizenId}`)}
                                style={{ flex: 1, background: theme.accent, color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <PlusCircle size={16} /> Add Record
                            </button>
                            <button style={{ background: theme.bgHover, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <ArrowUpRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
