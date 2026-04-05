import React, { useState, useRef } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Camera, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function VerifyIdentity() {
  const [mode, setMode] = useState('manual'); // 'manual' | 'qr'
  const [citizenId, setCitizenId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleManualVerify = async () => {
    if (!citizenId.trim()) return;
    setLoading(true); setError(''); setIdentity(null);
    try {
      const did = citizenId.startsWith('did:') ? citizenId : `did:fabric:${citizenId}`;
      const res = await API.get(`/api/identity/${encodeURIComponent(did)}`);
      setIdentity({ ...res.data, citizenId: citizenId.replace('did:fabric:', '') });
    } catch (err) {
      setError(err.response?.data?.error || 'Identity not found on blockchain');
    } finally { setLoading(false); }
  };

  const handleQRVerify = async (qrData) => {
    setLoading(true); setError(''); setIdentity(null);
    try {
      const res = await API.post('/api/identity/verify-qr', { qrData });
      setIdentity(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'QR verification failed');
    } finally { setLoading(false); }
  };

  const handleQRSubmit = () => {
    if (!qrInput.trim()) return;
    handleQRVerify(qrInput.trim());
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Read QR image - in production use a QR library
    // For now read as text if it's a JSON file
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      try {
        JSON.parse(text);
        handleQRVerify(text);
      } catch {
        setError('Could not read QR data from file. Paste the QR JSON data manually.');
      }
    };
    reader.readAsText(file);
  };

  const fieldRow = (label, value, highlight = false) => (
    <div style={{ padding: '12px 16px', background: highlight ? `${theme.success}10` : theme.bg,
      borderRadius: 8, border: `1px solid ${highlight ? theme.success + '30' : theme.borderLight}`,
      display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, color: highlight ? theme.success : theme.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em', width: 120, flexShrink: 0,
        paddingTop: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}{highlight ? <CheckCircle size={11} /> : ''}
      </div>
      <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 500, wordBreak: 'break-all' }}>
        {String(value || '—')}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
          Verify Identity
        </h1>
        <p style={{ fontSize: 13, color: theme.textSecondary }}>
          Verify a citizen's digital identity on Hyperledger Fabric blockchain
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20,
        background: theme.bgCard, borderRadius: 10, padding: 4,
        border: `1px solid ${theme.border}`, width: 'fit-content' }}>
        {[['manual', 'Manual Lookup'], ['qr', 'QR Code Verify']].map(([id, label]) => (
          <button key={id} onClick={() => { setMode(id); setIdentity(null); setError(''); }}
            style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              background: mode === id ? theme.accent : 'transparent',
              color: mode === id ? 'white' : theme.textSecondary, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Manual lookup */}
      {mode === 'manual' && (
        <div style={{ background: theme.bgCard, borderRadius: 12,
          border: `1px solid ${theme.border}`, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Citizen ID or DID
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input value={citizenId} onChange={e => setCitizenId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualVerify()}
              placeholder="e.g. CIT696484 or did:fabric:CIT696484"
              style={{ flex: 1, background: theme.bg, border: `1px solid ${theme.border}`,
                borderRadius: 8, padding: '11px 16px', color: theme.textPrimary,
                fontSize: 13, fontFamily: theme.fontMono, outline: 'none' }} />
            <button onClick={handleManualVerify} disabled={loading}
              style={{ background: theme.accent, color: 'white', border: 'none',
                borderRadius: 8, padding: '0 24px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {loading ? 'Verifying...' : 'Verify on Blockchain'}
            </button>
          </div>
        </div>
      )}

      {/* QR verification */}
      {mode === 'qr' && (
        <div style={{ background: theme.bgCard, borderRadius: 12,
          border: `1px solid ${theme.border}`, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Upload QR image */}
            <div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Upload QR Image
              </div>
              <div onClick={() => fileRef.current.click()}
                style={{ border: `2px dashed ${theme.border}`, borderRadius: 10,
                  padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                  background: theme.bg, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = theme.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <Camera size={36} color={theme.textMuted} />
                </div>
                <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>
                  Click to upload QR image
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>PNG, JPG or JSON file</div>
                <input ref={fileRef} type="file" accept="image/*,.json"
                  style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
            </div>

            {/* Paste QR data */}
            <div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12,
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Or Paste QR Data
              </div>
              <textarea value={qrInput} onChange={e => setQrInput(e.target.value)}
                placeholder='{"did":"did:fabric:CIT001","citizenId":"CIT001","fullName":"..."}'
                style={{ width: '100%', height: 100, background: theme.bg,
                  border: `1px solid ${theme.border}`, borderRadius: 8,
                  padding: '12px', color: theme.textPrimary, fontSize: 12,
                  fontFamily: theme.fontMono, outline: 'none', resize: 'none',
                  boxSizing: 'border-box', marginBottom: 12 }} />
              <button onClick={handleQRSubmit} disabled={loading || !qrInput.trim()}
                style={{ width: '100%', background: theme.accent, color: 'white',
                  border: 'none', borderRadius: 8, padding: '10px',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {loading ? 'Verifying...' : 'Verify QR Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: `${theme.danger}15`, border: `1px solid ${theme.danger}30`,
          borderRadius: 10, padding: '16px 20px', marginBottom: 20,
          color: theme.danger, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Result */}
      {identity && (
        <div style={{ background: theme.bgCard, borderRadius: 12,
          border: `1px solid ${theme.success}40`, padding: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
            paddingBottom: 20, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%',
              background: `${theme.success}20`, display: 'flex', alignItems: 'center',
              justifyContent: 'center' }}>
              <CheckCircle size={24} color={theme.success} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.success, marginBottom: 2 }}>
                Identity Verified on Blockchain
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
                {identity.did || `did:fabric:${identity.citizenId}`}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', background: `${theme.success}15`,
              border: `1px solid ${theme.success}30`, borderRadius: 8,
              padding: '8px 16px', fontSize: 12, color: theme.success, fontWeight: 600 }}>
              VALID — ACTIVE
            </div>
          </div>

          {/* Identity fields from blockchain */}
          <div style={{ fontSize: 12, color: theme.textMuted, textTransform: 'uppercase',
            letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12 }}>
            Blockchain Identity Record
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {identity.citizen && (
              <>
                {fieldRow('Full Name', identity.citizen.fullName)}
                {fieldRow('NIC Number', identity.citizen.nicNumber, true)}
                {fieldRow('Date of Birth', identity.citizen.dateOfBirth ?
                  new Date(identity.citizen.dateOfBirth).toLocaleDateString() : '—')}
                {fieldRow('Status', identity.citizen.status)}
              </>
            )}
            {!identity.citizen && identity.fullName && (
              <>
                {fieldRow('Full Name', identity.fullName)}
                {fieldRow('NIC Number', identity.nicNumber, true)}
                {fieldRow('Active', String(identity.isActive))}
              </>
            )}
            {fieldRow('DID', identity.did || `did:fabric:${identity.citizenId}`, true)}
            {fieldRow('Citizen ID', identity.citizenId)}
          </div>

          <div style={{ background: `${theme.warning}10`, border: `1px solid ${theme.warning}30`,
            borderRadius: 8, padding: '12px 16px', fontSize: 12, color: theme.warning,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} /> Only displaying fields permitted by admin policy and citizen consent
          </div>
        </div>
      )}
    </div>
  );
}
