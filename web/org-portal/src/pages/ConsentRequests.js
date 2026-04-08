import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

const STATUS_STYLE = {
  PENDING:  { color: theme.warning, bg: `${theme.warning}15`, label: 'PENDING',  icon: Clock },
  APPROVED: { color: theme.success, bg: `${theme.success}15`, label: 'APPROVED', icon: CheckCircle },
  REJECTED: { color: theme.danger,  bg: `${theme.danger}15`,  label: 'REJECTED', icon: XCircle },
  REVOKED:  { color: theme.textMuted, bg: theme.bgHover,      label: 'REVOKED',  icon: XCircle },
};

export default function ConsentRequests() {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('PENDING');
  const [actionId, setActionId]   = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // request id
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg]             = useState({ type: '', text: '' });

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/consent/org/requests');
      setRequests(res.data.requests || []);
    } catch { } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    setActionId(id); setMsg({ type: '', text: '' });
    try {
      await API.post(`/api/consent/org/approve/${id}`);
      setMsg({ type: 'success', text: 'Consent request approved.' });
      loadRequests();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to approve' });
    } finally { setActionId(null); }
  };

  const handleReject = async () => {
    setActionId(rejectModal); setMsg({ type: '', text: '' });
    try {
      await API.post(`/api/consent/org/reject/${rejectModal}`, { reason: rejectReason });
      setMsg({ type: 'success', text: 'Consent request rejected.' });
      setRejectModal(null); setRejectReason('');
      loadRequests();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to reject' });
    } finally { setActionId(null); }
  };

  const filtered  = requests.filter(r => filter === 'ALL' || r.status === filter);
  const pendingCt = requests.filter(r => r.status === 'PENDING').length;

  const cardStyle = { background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, padding: 24 };

  const TAB_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
          Consent Requests
        </h1>
        <p style={{ fontSize: 13, color: theme.textSecondary }}>
          Review and manage citizen consent requests for your organization
        </p>
      </div>

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
          background: msg.type === 'success' ? `${theme.success}15` : `${theme.danger}15`,
          border: `1px solid ${msg.type === 'success' ? theme.success : theme.danger}30`,
          color: msg.type === 'success' ? theme.success : theme.danger,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {TAB_FILTERS.map(s => {
          const count = s === 'ALL' ? requests.length : requests.filter(r => r.status === s).length;
          const st = s === 'ALL' ? { color: theme.accent } : (STATUS_STYLE[s] || {});
          return (
            <div key={s} style={{ ...cardStyle, cursor: 'pointer',
              border: `1px solid ${filter === s ? theme.accent : theme.border}`,
              background: filter === s ? theme.accentGlow : theme.bgCard }}
              onClick={() => setFilter(s)}>
              <div style={{ fontSize: 24, fontWeight: 700, color: st.color || theme.accent }}>{count}</div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, textTransform: 'uppercase',
                letterSpacing: '0.06em', fontWeight: 600 }}>{s}</div>
            </div>
          );
        })}
      </div>

      {/* Request list */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          {filter} Requests — {filtered.length}
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
            Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
            No {filter.toLowerCase()} requests.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(r => {
              const s = STATUS_STYLE[r.status] || STATUS_STYLE.REVOKED;
              const Icon = s.icon;
              const fields = Array.isArray(r.fields) ? r.fields : [];
              return (
                <div key={r.id} style={{ background: theme.bg, borderRadius: 10,
                  border: `1px solid ${r.status === 'PENDING' ? theme.warning + '40' : theme.borderLight}`,
                  padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>

                  <div style={{ background: theme.accentGlow, color: theme.accent,
                    padding: 10, borderRadius: 10, flexShrink: 0 }}>
                    <User size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary }}>
                        {r.fullName}
                      </span>
                      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontMono }}>
                        {r.citizenId}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>
                      NIC: <span style={{ color: theme.textSecondary, fontFamily: theme.fontMono }}>
                        {r.nicNumber}
                      </span>
                      <span style={{ marginLeft: 16 }}>
                        Submitted: {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {fields.map(f => (
                        <span key={f} style={{ fontSize: 11, color: theme.accent,
                          background: theme.accentGlow, padding: '2px 8px', borderRadius: 4,
                          border: `1px solid ${theme.accent}30` }}>{f}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: s.color, background: s.bg,
                      padding: '4px 10px', borderRadius: 4, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon size={11} /> {s.label}
                    </span>

                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleApprove(r.id)}
                          disabled={actionId === r.id}
                          style={{ background: `${theme.success}15`, color: theme.success,
                            border: `1px solid ${theme.success}30`, borderRadius: 7,
                            padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {actionId === r.id ? '...' : 'Approve'}
                        </button>
                        <button onClick={() => { setRejectModal(r.id); setRejectReason(''); }}
                          disabled={actionId === r.id}
                          style={{ background: `${theme.danger}15`, color: theme.danger,
                            border: `1px solid ${theme.danger}30`, borderRadius: 7,
                            padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
            padding: 32, width: 420 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: theme.textPrimary, marginBottom: 16 }}>
              Reject Consent Request
            </h3>
            <label style={{ fontSize: 12, color: theme.textMuted, display: 'block',
              marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Reason (optional)
            </label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} placeholder="Explain why you are rejecting this request..."
              style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
                padding: '10px 12px', color: theme.textPrimary, fontSize: 13,
                width: '100%', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRejectModal(null)}
                style={{ flex: 1, padding: 11, borderRadius: 8,
                  border: `1px solid ${theme.border}`, background: 'transparent',
                  color: theme.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={actionId !== null}
                style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none',
                  background: theme.danger, color: 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {actionId !== null ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
