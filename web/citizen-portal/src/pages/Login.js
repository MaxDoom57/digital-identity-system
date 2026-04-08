import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import API from '../api';
import { theme } from '../styles/theme';
import { ShieldCheck, ArrowRight, KeyRound, Fingerprint, Camera, CheckCircle } from 'lucide-react';

const STEPS = ['id', 'face', 'key']; // enter ID → face capture → device key

export default function Login({ onLogin }) {
    const navigate = useNavigate();
    const [step, setStep]           = useState('id');
    const [citizenId, setCitizenId] = useState('');
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [faceVerified, setFaceVerified] = useState(false);

    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Start camera when entering face step
    useEffect(() => {
        if (step === 'face') startCamera();
        return () => stopCamera();
    }, [step]);

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
            streamRef.current = s;
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch {
            setError('Camera access denied. Please allow camera in browser settings.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    // Step 1 — validate CitizenID and move to face step
    const handleIdSubmit = async (e) => {
        e.preventDefault();
        if (!citizenId.trim()) return;
        setLoading(true); setError('');
        try {
            // Check the citizen exists and has a device key
            const r = await API.get(`/api/webauthn/has-key?citizenId=${citizenId.trim()}`);
            if (!r.data.hasKey) {
                setError('No device key registered for this Citizen ID. Please set one up from the registration page after your identity is approved.');
                return;
            }
            setStep('face');
        } catch (err) {
            setError(err.response?.data?.error || 'Citizen ID not found');
        } finally { setLoading(false); }
    };

    // Step 2 — capture face and verify biometric
    const handleFaceVerify = async () => {
        const canvas = canvasRef.current;
        const video  = videoRef.current;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            setError('Camera not ready — please wait a moment and try again.');
            return;
        }

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const image = canvas.toDataURL('image/jpeg', 0.85);

        setLoading(true); setError('');
        try {
            const res = await API.post('/api/biometric/face/login-check', { citizenId, image });
            if (!res.data.verified) {
                setError('Face verification failed. Please ensure good lighting and face the camera directly.');
                return;
            }
            setFaceVerified(true);
            stopCamera();
            // Brief pause to show success, then proceed to device key
            setTimeout(() => setStep('key'), 800);
        } catch (err) {
            setError(err.response?.data?.error || 'Face verification error. Please try again.');
        } finally { setLoading(false); }
    };

    // Step 3 — WebAuthn device key
    const handleDeviceKey = async () => {
        setLoading(true); setError('');
        try {
            const optRes = await API.post('/api/webauthn/login-options', { citizenId });
            const credential = await startAuthentication(optRes.data);
            const verifyRes = await API.post('/api/webauthn/login-verify', { citizenId, credential });
            onLogin(verifyRes.data.token, verifyRes.data);
            navigate('/');
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setError('Authentication was cancelled or timed out. Please try again.');
            } else {
                setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Authentication failed');
            }
        } finally { setLoading(false); }
    };

    const stepNum = STEPS.indexOf(step) + 1;

    return (
        <div style={{
            minHeight: '100vh', background: theme.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            backgroundImage: 'radial-gradient(circle at 50% 50%, #1e3a5f30 0%, transparent 70%)'
        }}>
            <div style={{
                width: 440, background: theme.bgCard, borderRadius: 16,
                border: `1px solid ${theme.border}`, padding: 40,
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', background: theme.accentGlow, padding: 14, borderRadius: 18, marginBottom: 16 }}>
                        <ShieldCheck size={36} color={theme.accent} />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>My Identity</h1>
                    <p style={{ fontSize: 13, color: theme.textSecondary }}>Sri Lanka Digital Identity Citizen Portal</p>
                </div>

                {/* Step progress */}
                {step !== 'done' && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                        {[
                            { key: 'id',   label: 'Citizen ID' },
                            { key: 'face', label: 'Face Check' },
                            { key: 'key',  label: 'Device Key' },
                        ].map((s, i) => (
                            <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    height: 3, borderRadius: 2, marginBottom: 6,
                                    background: stepNum > i + 1 ? theme.success
                                              : stepNum === i + 1 ? theme.accent
                                              : theme.borderLight,
                                    transition: 'background 0.3s'
                                }} />
                                <div style={{
                                    fontSize: 10, color: stepNum === i + 1 ? theme.accent : theme.textMuted,
                                    fontWeight: stepNum === i + 1 ? 600 : 400
                                }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div style={{
                        background: `${theme.danger}15`, border: `1px solid ${theme.danger}40`,
                        borderRadius: 8, padding: '12px', color: theme.danger,
                        fontSize: 13, marginBottom: 20
                    }}>{error}</div>
                )}

                {/* ── Step 1: Citizen ID ── */}
                {step === 'id' && (
                    <form onSubmit={handleIdSubmit}>
                        <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
                            Enter your Citizen ID
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 20 }}>
                            Your unique Citizen ID (e.g. CIT123456)
                        </div>
                        <div style={{ position: 'relative', marginBottom: 28 }}>
                            <div style={{ position: 'absolute', left: 14, top: 13, color: theme.textMuted }}>
                                <ShieldIcon />
                            </div>
                            <input
                                style={{
                                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`,
                                    borderRadius: 8, padding: '12px 16px 12px 42px', color: theme.textPrimary,
                                    fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box',
                                    fontFamily: theme.fontMono, letterSpacing: '0.05em'
                                }}
                                value={citizenId}
                                onChange={e => setCitizenId(e.target.value.toUpperCase())}
                                placeholder="CIT000000"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading || !citizenId.trim()} style={btnStyle(theme)}>
                            {loading ? 'Checking...' : <><span>Continue</span><ArrowRight size={16} /></>}
                        </button>
                    </form>
                )}

                {/* ── Step 2: Face capture ── */}
                {step === 'face' && (
                    <div>
                        <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
                            Face Verification
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
                            Look directly at the camera in good lighting
                        </div>

                        <div style={{
                            borderRadius: 12, overflow: 'hidden', marginBottom: 16,
                            border: `2px solid ${faceVerified ? theme.success : theme.border}`,
                            background: theme.bg, position: 'relative', aspectRatio: '4/3'
                        }}>
                            {faceVerified ? (
                                <div style={{
                                    height: '100%', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 12
                                }}>
                                    <CheckCircle size={48} color={theme.success} />
                                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.success }}>
                                        Face verified
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <video ref={videoRef} autoPlay playsInline
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    {/* Oval face guide */}
                                    <div style={{
                                        position: 'absolute', inset: 0, pointerEvents: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <div style={{
                                            width: 160, height: 200, borderRadius: '50%',
                                            border: `2px dashed ${theme.accent}80`
                                        }} />
                                    </div>
                                </>
                            )}
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        <button onClick={handleFaceVerify} disabled={loading || faceVerified} style={btnStyle(theme)}>
                            {loading ? <><SpinnerIcon /> Verifying...</>
                                     : <><Camera size={16} /> Capture & Verify</>}
                        </button>
                        <button onClick={() => { setStep('id'); setError(''); stopCamera(); }}
                            style={{ ...ghostBtnStyle(theme), marginTop: 8 }}>
                            Back
                        </button>
                    </div>
                )}

                {/* ── Step 3: Device Key ── */}
                {step === 'key' && (
                    <div>
                        <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
                            Authenticate with Device Key
                        </div>
                        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 24 }}>
                            Your face was verified. Now approve with your device key.
                        </div>

                        <div style={{
                            background: `${theme.success}10`, border: `1px solid ${theme.success}30`,
                            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <CheckCircle size={16} color={theme.success} />
                            <div style={{ fontSize: 12, color: theme.success, fontWeight: 600 }}>
                                Face verification passed
                            </div>
                        </div>

                        <div style={{
                            background: `${theme.accent}08`, border: `1px solid ${theme.accent}25`,
                            borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                            display: 'flex', alignItems: 'center', gap: 12
                        }}>
                            <KeyRound size={20} color={theme.accent} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent }}>Device Key</div>
                                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                                    Windows Hello / Touch ID / Security Key
                                </div>
                            </div>
                        </div>

                        <button onClick={handleDeviceKey} disabled={loading} style={btnStyle(theme)}>
                            {loading
                                ? <><SpinnerIcon /> Waiting for device key...</>
                                : <><Fingerprint size={16} /> Sign In with Device Key</>}
                        </button>
                        <button onClick={() => { setStep('face'); setError(''); setFaceVerified(false); }}
                            style={{ ...ghostBtnStyle(theme), marginTop: 8 }}>
                            Back
                        </button>
                    </div>
                )}

                <div style={{
                    marginTop: 24, textAlign: 'center',
                    borderTop: `1px solid ${theme.borderLight}`, paddingTop: 20
                }}>
                    <span style={{ fontSize: 13, color: theme.textMuted }}>Need a digital identity? </span>
                    <Link to="/register" style={{ color: theme.accent, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                        Create account
                    </Link>
                </div>
            </div>
        </div>
    );
}

const btnStyle = (theme) => ({
    width: '100%', background: theme.accent, color: 'white', border: 'none',
    borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
});
const ghostBtnStyle = (theme) => ({
    width: '100%', background: 'transparent', color: theme.textMuted,
    border: `1px solid ${theme.border}`, borderRadius: 8, padding: '11px',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center'
});
const ShieldIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);
const SpinnerIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
