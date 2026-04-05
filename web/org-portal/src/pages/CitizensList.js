import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { theme } from '../styles/theme';
import { User, Search, PlusCircle, ArrowUpRight, Camera, X, CheckCircle, XCircle, Loader } from 'lucide-react';

// ── Add Citizen Modal ──────────────────────────────────────────────────────────
function AddCitizenModal({ onClose, onSuccess }) {
    const [step, setStep] = useState('lookup'); // lookup | capture | verifying | done | error
    const [citizenId, setCitizenId] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [foundCitizen, setFoundCitizen] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Start camera when entering capture step
    useEffect(() => {
        if (step === 'capture') startCamera();
        return () => stopCamera();
    }, [step]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch { setVerifyError('Camera access denied. Please allow camera permissions.'); }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const handleLookup = async () => {
        if (!citizenId.trim()) return;
        setLookupLoading(true);
        setLookupError('');
        try {
            const res = await API.get(`/api/orgrecords/citizen-lookup/${citizenId.trim()}`);
            setFoundCitizen(res.data.citizen);
            setStep('capture');
        } catch (err) {
            setLookupError(err.response?.data?.error || 'Citizen not found');
        } finally { setLookupLoading(false); }
    };

    const handleCapture = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const image = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(image);
        stopCamera();
        setStep('verifying');
        setVerifyError('');

        try {
            await API.post('/api/orgrecords/enroll', { citizenId: foundCitizen.citizenId, faceImage: image });
            setStep('done');
        } catch (err) {
            setVerifyError(err.response?.data?.error || 'Verification failed');
            setStep('error');
        }
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setVerifyError('');
        setStep('capture');
    };

    const overlayStyle = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(6px)'
    };
    const boxStyle = {
        background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
        padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto'
    };

    return (
        <div style={overlayStyle}>
            <div style={boxStyle}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>Add Citizen</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                    {[
                        { key: 'lookup',    label: '1. Enter ID' },
                        { key: 'capture',   label: '2. Face Scan' },
                        { key: 'verifying', label: '3. Verify' },
                        { key: 'done',      label: '4. Done' },
                    ].map(s => {
                        const active = step === s.key || (step === 'error' && s.key === 'capture');
                        const done   = (s.key === 'lookup' && ['capture','verifying','done','error'].includes(step)) ||
                                       (s.key === 'capture' && ['verifying','done','error'].includes(step)) ||
                                       (s.key === 'verifying' && ['done'].includes(step));
                        return (
                            <div key={s.key} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, textAlign: 'center',
                                fontSize: 11, fontWeight: 600,
                                background: done ? `${theme.success}15` : active ? theme.accentGlow : theme.bg,
                                color: done ? theme.success : active ? theme.accent : theme.textMuted,
                                border: `1px solid ${done ? theme.success + '40' : active ? theme.accent + '40' : theme.border}` }}>
                                {s.label}
                            </div>
                        );
                    })}
                </div>

                {/* STEP 1: Lookup */}
                {step === 'lookup' && (
                    <div>
                        <label style={{ display: 'block', fontSize: 11, color: theme.textMuted,
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            Citizen ID
                        </label>
                        <input
                            style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                                padding: '12px 14px', color: theme.textPrimary, fontSize: 14,
                                width: '100%', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                            placeholder="e.g. CIT123456"
                            value={citizenId}
                            onChange={e => setCitizenId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLookup()}
                            autoFocus
                        />
                        {lookupError && (
                            <div style={{ color: theme.danger, fontSize: 12, marginBottom: 12,
                                display: 'flex', alignItems: 'center', gap: 6 }}>
                                <XCircle size={13} /> {lookupError}
                            </div>
                        )}
                        <button onClick={handleLookup} disabled={lookupLoading || !citizenId.trim()}
                            style={{ width: '100%', background: theme.accent, color: 'white', border: 'none',
                                borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            {lookupLoading ? 'Looking up...' : 'Find Citizen'}
                        </button>
                    </div>
                )}

                {/* STEP 2: Camera */}
                {(step === 'capture' || step === 'error') && (
                    <div>
                        {foundCitizen && (
                            <div style={{ background: theme.bg, borderRadius: 8, padding: '12px 16px',
                                marginBottom: 20, border: `1px solid ${theme.border}` }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                                    {foundCitizen.fullName}
                                </div>
                                <div style={{ fontSize: 12, color: theme.accent, fontFamily: theme.fontMono }}>
                                    {foundCitizen.citizenId} · {foundCitizen.nicNumber}
                                </div>
                            </div>
                        )}

                        {verifyError && (
                            <div style={{ color: theme.danger, fontSize: 12, marginBottom: 12,
                                background: `${theme.danger}10`, border: `1px solid ${theme.danger}30`,
                                borderRadius: 8, padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: 6 }}>
                                <XCircle size={13} /> {verifyError}
                            </div>
                        )}

                        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
                            border: `2px solid ${theme.accent}40`, marginBottom: 16 }}>
                            <video ref={videoRef} autoPlay playsInline muted
                                style={{ width: '100%', display: 'block', borderRadius: 10 }} />
                            {/* Face guide overlay */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ width: 160, height: 200, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                    border: `2px dashed ${theme.accent}70` }} />
                            </div>
                        </div>

                        <p style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', marginBottom: 16 }}>
                            Position the citizen's face inside the guide and press Capture
                        </p>

                        <div style={{ display: 'flex', gap: 10 }}>
                            {step === 'error' && (
                                <button onClick={() => { setStep('lookup'); setFoundCitizen(null); setCitizenId(''); setVerifyError(''); }}
                                    style={{ flex: 1, padding: 12, borderRadius: 8,
                                        border: `1px solid ${theme.border}`, background: 'transparent',
                                        color: theme.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                    Try Different ID
                                </button>
                            )}
                            <button onClick={step === 'error' ? handleRetry : handleCapture}
                                style={{ flex: 1, background: theme.accent, color: 'white', border: 'none',
                                    borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Camera size={16} /> {step === 'error' ? 'Retry Scan' : 'Capture & Verify'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Verifying */}
                {step === 'verifying' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        {capturedImage && (
                            <img src={capturedImage} alt="Captured"
                                style={{ width: 180, height: 135, objectFit: 'cover',
                                    borderRadius: 10, marginBottom: 20, border: `2px solid ${theme.accent}40` }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 10, color: theme.accent, fontSize: 15, fontWeight: 600 }}>
                            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                            Verifying face...
                        </div>
                        <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 10 }}>
                            Comparing against biometric record on blockchain
                        </p>
                        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                    </div>
                )}

                {/* STEP 4: Done */}
                {step === 'done' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle size={56} color={theme.success} style={{ marginBottom: 16 }} />
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>
                            Citizen Added
                        </h3>
                        <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                            <strong style={{ color: theme.textPrimary }}>{foundCitizen?.fullName}</strong> has been
                            successfully verified and added to your registry.
                        </p>
                        <p style={{ fontSize: 11, color: theme.textMuted, marginBottom: 24 }}>
                            {foundCitizen?.citizenId}
                        </p>
                        <button onClick={() => { onSuccess(); onClose(); }}
                            style={{ background: theme.accent, color: 'white', border: 'none',
                                borderRadius: 8, padding: '12px 32px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CitizensList() {
    const navigate = useNavigate();
    const [citizens, setCitizens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => { loadCitizens(); }, []);

    const loadCitizens = async () => {
        setLoading(true);
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
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
                        My Citizens
                    </h1>
                    <p style={{ fontSize: 13, color: theme.textSecondary }}>
                        Citizens enrolled in your organization via face verification
                    </p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    style={{ background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
                        padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlusCircle size={18} /> Add Citizen
                </button>
            </div>

            <div style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
                padding: 20, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%',
                        transform: 'translateY(-50%)', color: theme.textMuted }} />
                    <input
                        style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                            padding: '12px 16px 12px 48px', color: theme.textPrimary, width: '100%',
                            fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                        placeholder="Search by Name, NIC, or Citizen ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ color: theme.textMuted, padding: 40, textAlign: 'center', fontSize: 13 }}>
                    Loading citizens...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
                    padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
                    {citizens.length === 0
                        ? 'No citizens enrolled yet. Click "Add Citizen" to enroll one.'
                        : 'No citizens match your search.'}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {filtered.map(c => (
                        <div key={c.citizenId} style={{ background: theme.bgCard, borderRadius: 12,
                            border: `1px solid ${theme.border}`, padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ background: theme.accentGlow, color: theme.accent,
                                    padding: 12, borderRadius: 12 }}>
                                    <User size={24} />
                                </div>
                                <div style={{ fontSize: 10, background: `${theme.success}15`, color: theme.success,
                                    padding: '2px 8px', borderRadius: 4, fontWeight: 700, height: 'fit-content' }}>
                                    ENROLLED
                                </div>
                            </div>

                            <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
                                {c.fullName}
                            </h3>
                            <div style={{ fontSize: 12, color: theme.textMuted,
                                fontFamily: theme.fontMono, marginBottom: 16 }}>
                                {c.citizenId}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                <div style={{ fontSize: 13, color: theme.textSecondary,
                                    display: 'flex', justifyContent: 'space-between' }}>
                                    <span>NIC Number</span>
                                    <span style={{ color: theme.textPrimary, fontWeight: 500 }}>{c.nicNumber}</span>
                                </div>
                                {c.linkedAt && (
                                    <div style={{ fontSize: 13, color: theme.textSecondary,
                                        display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Enrolled</span>
                                        <span style={{ color: theme.textMuted, fontSize: 11 }}>
                                            {new Date(c.linkedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => navigate(`/add-record/${c.citizenId}`)}
                                    style={{ flex: 1, background: theme.accent, color: 'white', border: 'none',
                                        borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: 6 }}>
                                    <PlusCircle size={16} /> Add Record
                                </button>
                                <button onClick={() => navigate(`/add-record/${c.citizenId}`)}
                                    style={{ background: theme.bgHover, color: theme.textPrimary,
                                        border: `1px solid ${theme.border}`, borderRadius: 8,
                                        padding: '10px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <AddCitizenModal
                    onClose={() => setShowAdd(false)}
                    onSuccess={loadCitizens}
                />
            )}
        </div>
    );
}
