import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { theme } from '../styles/theme';
import { User, FileText, CheckCircle, AlertCircle, ArrowLeft, Database, Shield } from 'lucide-react';

export default function AddRecord() {
    const { citizenId } = useParams();
    const navigate = useNavigate();
    const [citizen, setCitizen] = useState(null);
    const [form, setForm] = useState({ recordType: 'Medical', recordTitle: '', recordData: '' });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        // Usually we would fetch minimal citizen info here
        setCitizen({ citizenId });
    }, [citizenId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/api/orgrecords/add', {
                citizenId,
                ...form
            });
            setMsg('Record signed and anchored to blockchain successfully.');
            setTimeout(() => navigate('/citizens'), 2000);
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed to add record');
        } finally { setLoading(false); }
    };

    const inputStyle = {
        background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
        padding: '12px', color: theme.textPrimary, fontSize: 14, width: '100%', marginBottom: 20
    };

    return (
        <div style={{ maxWidth: 640 }}>
            <button onClick={() => navigate('/citizens')} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 14 }}>
                <ArrowLeft size={16} /> Back to Registry
            </button>

            <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                    <div style={{ background: theme.accentGlow, color: theme.accent, padding: 12, borderRadius: 12 }}><Database size={24} /></div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>Add official Record</h2>
                        <p style={{ fontSize: 13, color: theme.textSecondary }}>Attesting to identity: <span style={{ fontFamily: theme.fontMono, color: theme.accent }}>{citizenId}</span></p>
                    </div>
                </div>

                {msg && (
                    <div style={{ background: msg.includes('signed') ? `${theme.success}10` : `${theme.danger}10`, border: `1px solid ${msg.includes('signed') ? theme.success : theme.danger}30`, borderRadius: 8, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: msg.includes('signed') ? theme.success : theme.danger, fontSize: 14 }}>
                        {msg.includes('signed') ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={{ fontSize: 12, color: theme.textSecondary, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Record Category</label>
                    <select style={inputStyle} value={form.recordType} onChange={e => setForm({ ...form, recordType: e.target.value })}>
                        <option>Medical</option>
                        <option>Financial</option>
                        <option>Educational</option>
                        <option>Employment</option>
                        <option>Government Clearance</option>
                    </select>

                    <label style={{ fontSize: 12, color: theme.textSecondary, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Title</label>
                    <input style={inputStyle} placeholder="e.g., Annual Health Screening 2024" value={form.recordTitle} onChange={e => setForm({ ...form, recordTitle: e.target.value })} required />

                    <label style={{ fontSize: 12, color: theme.textSecondary, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payload / Data Content</label>
                    <textarea style={{ ...inputStyle, height: 120, resize: 'none' }} placeholder="Enter record details or JSON payload..." value={form.recordData} onChange={e => setForm({ ...form, recordData: e.target.value })} required />

                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: `1px solid ${theme.borderLight}`, marginBottom: 32 }}>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Shield size={12} /> CRYPTOGRAPHIC SIGNATURE
                        </div>
                        <div style={{ fontSize: 12, color: theme.textSecondary }}>
                            This record will be signed with your organization's private key and anchored to the citizen's decentralized identity ledger.
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{ width: '100%', background: theme.accent, color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 16px -4px ${theme.accent}40` }}>
                        {loading ? 'Signing Record...' : 'Sign & Anchor to Ledger'}
                    </button>
                </form>
            </div>
        </div>
    );
}
