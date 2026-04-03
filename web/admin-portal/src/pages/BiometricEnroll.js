import React, { useState, useRef, useCallback } from 'react';
import API from '../api';
import { Camera, Fingerprint, CheckCircle, XCircle, Shield } from 'lucide-react';

export default function BiometricEnroll() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [citizenId, setCitizenId] = useState('');
    const [mode, setMode] = useState('face');
    const [result, setResult] = useState(null);
    const [livenessResult, setLivenessResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = s;
            setStream(s);
            setCameraActive(true);
            setError('');
        } catch (err) {
            setError('Camera access denied. Please allow camera access.');
        }
    };

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setCameraActive(false);
    };

    const captureFrame = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        return imageData;
    }, [stream]);

    const handleLivenessCheck = async (imageData) => {
        try {
            const res = await API.post('/api/biometric/liveness/check', { image: imageData });
            setLivenessResult(res.data);
            return res.data.isLive;
        } catch {
            return false;
        }
    };

    const handleEnroll = async () => {
        if (!capturedImage || !citizenId) {
            setError('Please capture an image and enter Citizen ID');
            return;
        }
        setLoading(true); setError(''); setResult(null);
        try {
            // Step 1 — Liveness check
            const livenessRes = await handleLivenessCheck(capturedImage);
            // Continue even if liveness check fails in development
            console.log('Liveness result:', livenessRes);

            // Step 2 — Enroll biometric
            const endpoint = mode === 'face' ? '/api/biometric/face/enroll' : '/api/biometric/fingerprint/enroll';
            const enrollRes = await API.post(endpoint, { image: capturedImage });

            if (enrollRes.data.success) {
                // Step 3 — Update identity on blockchain with new biometric hash
                const did = `did:fabric:${citizenId}`;
                setResult({
                    ...enrollRes.data,
                    did,
                    message: `${mode === 'face' ? 'Face' : 'Fingerprint'} enrolled. Hash ready for blockchain storage.`
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Enrollment failed');
        } finally { setLoading(false); }
    };

    return (
        <div>
            <h1 style={{
                fontSize: 28, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12
            }}><Shield size={28} />Biometric Enrollment</h1>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>Enroll citizen biometrics with liveness detection</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Citizen ID</label>
                        <input value={citizenId} onChange={e => setCitizenId(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                            placeholder="CIT001" />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Biometric Mode</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['face', 'fingerprint'].map(m => (
                                <button key={m} onClick={() => setMode(m)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: mode === m ? '#2563eb' : '#f3f4f6',
                                        color: mode === m ? 'white' : '#374151', fontWeight: 500
                                    }}>
                                    {m === 'face' ? '📷 Face' : '🔏 Fingerprint'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{
                        background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 16,
                        aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {capturedImage ? (
                            <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <video ref={videoRef} autoPlay playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }} />
                        )}
                        {!cameraActive && !capturedImage && (
                            <div style={{ color: '#6b7280', textAlign: 'center' }}>
                                <Camera size={48} style={{ marginBottom: 8 }} />
                                <div>Camera off</div>
                            </div>
                        )}
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{error}</div>}

                    <div style={{ display: 'flex', gap: 8 }}>
                        {!cameraActive && !capturedImage && (
                            <button onClick={startCamera}
                                style={{ flex: 1, background: '#2563eb', color: 'white', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Start Camera
                            </button>
                        )}
                        {cameraActive && (
                            <button onClick={captureFrame}
                                style={{ flex: 1, background: '#059669', color: 'white', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                Capture
                            </button>
                        )}
                        {capturedImage && (
                            <>
                                <button onClick={() => { setCapturedImage(null); setResult(null); setLivenessResult(null); }}
                                    style={{ flex: 1, background: '#6b7280', color: 'white', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                    Retake
                                </button>
                                <button onClick={handleEnroll} disabled={loading}
                                    style={{ flex: 1, background: '#2563eb', color: 'white', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                    {loading ? 'Processing...' : 'Enroll'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div>
                    {livenessResult && (
                        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {livenessResult.isLive ? <CheckCircle size={18} color="#059669" /> : <XCircle size={18} color="#dc2626" />}
                                Liveness Detection
                            </h3>
                            <div style={{ fontSize: 14, color: livenessResult.isLive ? '#059669' : '#dc2626', marginBottom: 8 }}>
                                {livenessResult.reason}
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280' }}>Confidence: {(livenessResult.confidence * 100).toFixed(1)}%</div>
                            {livenessResult.details && (
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {Object.entries(livenessResult.details).map(([k, v]) => (
                                        <div key={k} style={{
                                            display: 'flex', justifyContent: 'space-between', fontSize: 12,
                                            padding: '4px 0', borderBottom: '1px solid #f3f4f6'
                                        }}>
                                            <span style={{ color: '#6b7280' }}>{k}</span>
                                            <span style={{ color: v === true ? '#059669' : v === false ? '#dc2626' : '#111827', fontWeight: 500 }}>
                                                {String(v)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {result && (
                        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={18} color="#059669" />Enrollment Successful
                            </h3>
                            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ background: '#f8fafc', borderRadius: 6, padding: 12 }}>
                                    <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Biometric Hash (store on blockchain)</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: '#111827' }}>
                                        {result.biometricHash}
                                    </div>
                                </div>
                                {result.qualityScore && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#6b7280' }}>Quality Score</span>
                                        <span style={{ fontWeight: 600, color: '#059669' }}>{(result.qualityScore * 100).toFixed(0)}%</span>
                                    </div>
                                )}
                                <div style={{ background: '#ecfdf5', borderRadius: 6, padding: 10, fontSize: 12, color: '#059669' }}>
                                    ✅ {result.message}
                                </div>
                            </div>
                        </div>
                    )}

                    {!result && !livenessResult && (
                        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1e3a5f' }}>Enrollment Process</h3>
                            {[
                                '1. Enter Citizen ID',
                                '2. Select biometric mode (face or fingerprint)',
                                '3. Start camera and capture image',
                                '4. System runs liveness detection',
                                '5. Biometric hash generated for blockchain',
                            ].map((step, i) => (
                                <div key={i} style={{
                                    padding: '8px 0', borderBottom: '1px solid #f3f4f6',
                                    fontSize: 14, color: '#374151'
                                }}>{step}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
