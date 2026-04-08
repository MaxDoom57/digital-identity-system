import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

const STATUS_STYLE = {
  APPROVED: { color: theme.success, bg: `${theme.success}15`, label: 'ACTIVE' },
  PENDING:  { color: theme.warning, bg: `${theme.warning}15`, label: 'PENDING' },
  REJECTED: { color: theme.danger,  bg: `${theme.danger}15`,  label: 'REJECTED' },
  REVOKED:  { color: theme.textMuted, bg: `${theme.bgHover}`, label: 'REVOKED' },
};

const StatusIcon = ({ status }) => {
  if (status === 'APPROVED') return <CheckCircle size={13} />;
  if (status === 'PENDING')  return <Clock size={13} />;
  return <XCircle size={13} />;
};

export default function ConsentManager() {
  const [profile, setProfile]         = useState({ permissions: {}, requests: [] });
  const [orgs, setOrgs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [showGrant, setShowGrant]     = useState(false);
  const [form, setForm]               = useState({ orgId: '', fields: [] });
  const [msg, setMsg]                 = useState({ type: '', text: '' });

  const ALL_FIELDS = ['fullName', 'nicNumber', 'dateOfBirth', 'address', 'phone', 'email'];
  const citizenData = JSON.parse(localStorage.getItem('citizenData') || '{}');
  const citizenId = citizenData.citizenId;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, orgsRes] = await Promise.all([
        API.get(`/api/consent/profile/${citizenId}`).catch(() => ({ data: { permissions: {}, requests: [] } })),
        API.get('/api/citizen/orgs').catch(() => ({ data: [] }))
      ]);
      setProfile(profileRes.data || { permissions: {}, requests: [] });
      setOrgs(Array.isArray(orgsRes.data) ? orgsRes.data : []);
    } finally { setLoading(false); }
  };

  const toggleField = (f) => setForm(prev => ({
    ...prev,
    fields: prev.fields.includes(f) ? prev.fields.filter(x => x !== f) : [...prev.fields, f]
  }));

  const handleRequest = async () => {
    if (!form.orgId || form.fields.length === 0) return;
    setGrantLoading(true); setMsg({ type: '', text: '' });
    try {
      await API.post('/api/consent/request', { citizenId, orgId: form.orgId, fields: form.fields });
      setMsg({ type: 'success', text: `Consent request sent to ${form.orgId}. Awaiting their approval.` });
      setShowGrant(false);
      setForm({ orgId: '', fields: [] });
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to submit consent request' });
    } finally { setGrantLoading(false); }
  };

  const handleRevoke = async (orgId) => {
    setMsg({ type: '', text: '' });
    try {
      await API.post('/api/consent/revoke', { citizenId, orgId });
      setMsg({ type: 'success', text: `Consent revoked from ${orgId}` });
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to revoke' });
    }
  };

  const requests = profile.requests || [];
  const active   = requests.filter(r => r.status === 'APPROVED');
  const pending  = requests.filter(r => r.status === 'PENDING');

  // Orgs that don't yet have any request (available to request)
  const requestedOrgIds = new Set(requests.map(r => r.orgId));

  const cardStyle = { background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, padding: 24 };

  if (loading) return (
    <div style={{ color: theme.textMuted, padding: 40, textAlign: 'center' }}>Loading consent data...</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>Consent Manager</h1>
        <p style={{ fontSize: 13, color: theme.textSecondary }}>
          Control which organizations can access your identity data
        </p>
      </div>

      {msg.text && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
          background: msg.type === 'success' ? `${theme.success}15` : `${theme.danger}15`,
          border: `1px solid ${msg.type === 'success' ? theme.success : theme.danger}30`,
          color: msg.type === 'success' ? theme.success : theme.danger,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Consents',  value: active.length,   color: theme.success },
          { label: 'Pending Requests', value: pending.length,  color: theme.warning },
          { label: 'Available Orgs',   value: orgs.length,     color: theme.accent  },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: theme.fontMono }}>{s.value}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending requests notice */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px',
          background: `${theme.warning}10`, border: `1px solid ${theme.warning}30`,
          borderRadius: 10, marginBottom: 24, color: theme.warning, fontSize: 13 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>{pending.length} consent request{pending.length > 1 ? 's' : ''} pending</strong>
            {' '}— waiting for organization approval. You will be notified when they respond.
          </div>
        </div>
      )}

      {/* All consent requests / active consents */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            My Consent Requests — {requests.length}
          </div>
          <button onClick={() => setShowGrant(true)}
            style={{ background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + New Request
          </button>
        </div>

        {requests.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
            No consent requests yet. Submit a request to allow an organization to verify your identity.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(r => {
              const orgInfo = orgs.find(o => o.orgId === r.orgId);
              const s = STATUS_STYLE[r.status] || STATUS_STYLE.REVOKED;
              return (
                <div key={r.id} style={{ background: theme.bg, borderRadius: 10,
                  border: `1px solid ${r.status === 'APPROVED' ? theme.accent + '30' : theme.borderLight}`,
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 2 }}>
                      {orgInfo?.orgName || r.orgId}
                    </div>
                    <div style={{ fontSize: 11, color: theme.accent, fontFamily: theme.fontMono, marginBottom: 8 }}>
                      {r.orgId}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(r.fields || []).map(f => (
                        <span key={f} style={{ fontSize: 11, color: theme.accent,
                          background: theme.accentGlow, padding: '2px 8px', borderRadius: 4,
                          border: `1px solid ${theme.accent}30` }}>{f}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 8 }}>
                      Submitted {new Date(r.createdAt).toLocaleDateString()}
                      {r.updatedAt !== r.createdAt ? ` · Updated ${new Date(r.updatedAt).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: s.color, background: s.bg,
                      padding: '3px 10px', borderRadius: 4, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusIcon status={r.status} /> {s.label}
                    </span>
                    {r.status === 'APPROVED' && (
                      <button onClick={() => handleRevoke(r.orgId)}
                        style={{ background: `${theme.danger}15`, color: theme.danger,
                          border: `1px solid ${theme.danger}30`, borderRadius: 7,
                          padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Revoke
                      </button>
                    )}
                    {(r.status === 'REJECTED' || r.status === 'REVOKED') && (
                      <button onClick={() => {
                        setForm({ orgId: r.orgId, fields: r.fields || [] });
                        setShowGrant(true);
                      }}
                        style={{ background: theme.accentGlow, color: theme.accent,
                          border: `1px solid ${theme.accent}30`, borderRadius: 7,
                          padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Re-request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available orgs */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Registered Organizations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12 }}>
          {orgs.map(org => {
            const req = requests.find(r => r.orgId === org.orgId);
            const s = req ? (STATUS_STYLE[req.status] || STATUS_STYLE.REVOKED) : null;
            return (
              <div key={org.orgId} style={{ background: theme.bg, borderRadius: 8,
                border: `1px solid ${req?.status === 'APPROVED' ? theme.accent + '40' : theme.borderLight}`,
                padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
                  {org.orgName}
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>{org.sector}</div>
                <div style={{ fontSize: 11, color: s ? s.color : theme.textMuted, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  {s && <StatusIcon status={req.status} />}
                  {s ? s.label : 'No request'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grant / Request modal */}
      {showGrant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
            padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>
              Request Consent
            </h2>
            <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 20 }}>
              The organization will review your request and approve or reject it.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: 'block',
                marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Organization
              </label>
              <select value={form.orgId} onChange={e => setForm({ ...form, orgId: e.target.value })}
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                  padding: '10px 12px', color: theme.textPrimary, fontSize: 13,
                  width: '100%', outline: 'none' }}>
                <option value="">Select organization...</option>
                {orgs.map(o => (
                  <option key={o.orgId} value={o.orgId}>{o.orgName} ({o.orgId})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: 'block',
                marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Fields to Share
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ALL_FIELDS.map(f => {
                  const selected = form.fields.includes(f);
                  return (
                    <div key={f} onClick={() => toggleField(f)}
                      style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        background: selected ? theme.accentGlow : theme.bg,
                        border: `1px solid ${selected ? theme.accent : theme.border}`,
                        color: selected ? theme.accent : theme.textSecondary,
                        fontSize: 13, fontWeight: selected ? 600 : 400, transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6 }}>
                      {selected && <CheckCircle size={13} />} {f}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowGrant(false); setForm({ orgId: '', fields: [] }); }}
                style={{ flex: 1, padding: '11px', borderRadius: 8,
                  border: `1px solid ${theme.border}`, background: 'transparent',
                  color: theme.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleRequest}
                disabled={grantLoading || !form.orgId || form.fields.length === 0}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none',
                  background: (!form.orgId || form.fields.length === 0) ? theme.bgHover : theme.accent,
                  color: (!form.orgId || form.fields.length === 0) ? theme.textMuted : 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {grantLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
