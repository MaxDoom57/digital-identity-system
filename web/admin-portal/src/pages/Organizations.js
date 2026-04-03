import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Building2, Plus, Shield, Globe, Trash2, Edit2, X } from 'lucide-react';

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [newOrg, setNewOrg] = useState({ orgId: '', orgName: '', sector: 'Government', allowedFields: [] });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const sectors = ['Government', 'Banking', 'Healthcare', 'Education', 'Telecommunication'];
  const fields = ['FullName', 'DOB', 'Address', 'Phone', 'Email', 'NIC'];

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    try {
      const res = await API.get('/api/admin/orgs');
      setOrgs(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleRegister = async () => {
    if (!newOrg.orgId || !newOrg.orgName) return;
    setLoading(true);
    try {
      await API.post('/api/admin/org/register', newOrg);
      showMsg('success', `${newOrg.orgName} registered successfully`);
      setShowAdd(false);
      setNewOrg({ orgId: '', orgName: '', sector: 'Government', allowedFields: [] });
      loadOrgs();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!editOrg) return;
    setLoading(true);
    try {
      await API.put(`/api/admin/org/update/${editOrg.orgId}`, { allowedFields: editOrg.allowedFields });
      showMsg('success', `${editOrg.orgName} updated successfully`);
      setEditOrg(null);
      loadOrgs();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Remove ${org.orgName}? This will suspend their blockchain access.`)) return;
    try {
      await API.delete(`/api/admin/org/${org.orgId}`);
      showMsg('success', `${org.orgName} suspended`);
      loadOrgs();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Delete failed');
    }
  };

  const toggleField = (f, isEdit = false) => {
    if (isEdit) {
      const current = editOrg.allowedFields || [];
      setEditOrg({ ...editOrg, allowedFields: current.includes(f) ? current.filter(x => x !== f) : [...current, f] });
    } else {
      const current = newOrg.allowedFields;
      setNewOrg({ ...newOrg, allowedFields: current.includes(f) ? current.filter(x => x !== f) : [...current, f] });
    }
  };

  const parseFields = (f) => {
    if (Array.isArray(f)) return f;
    if (typeof f === 'string') {
      try { return JSON.parse(f); } catch { return f.split(',').filter(Boolean); }
    }
    return [];
  };

  const inputStyle = {
    background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
    padding: '10px 12px', color: theme.textPrimary, fontSize: 13, width: '100%',
    outline: 'none', marginBottom: 16, boxSizing: 'border-box'
  };

  const Modal = ({ title, orgData, onSave, onClose, isEdit }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`,
        padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            color: theme.textMuted, cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {!isEdit && (
          <>
            <label style={{ fontSize: 11, color: theme.textMuted, display: 'block',
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organization ID</label>
            <input style={inputStyle} value={newOrg.orgId}
              onChange={e => setNewOrg({ ...newOrg, orgId: e.target.value })}
              placeholder="e.g. SAMPATH-BANK" />

            <label style={{ fontSize: 11, color: theme.textMuted, display: 'block',
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Official Name</label>
            <input style={inputStyle} value={newOrg.orgName}
              onChange={e => setNewOrg({ ...newOrg, orgName: e.target.value })}
              placeholder="e.g. Sampath Bank PLC" />

            <label style={{ fontSize: 11, color: theme.textMuted, display: 'block',
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sector</label>
            <select style={inputStyle} value={newOrg.sector}
              onChange={e => setNewOrg({ ...newOrg, sector: e.target.value })}>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <label style={{ fontSize: 11, color: theme.textMuted, display: 'block',
          marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Data Access Permissions
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {fields.map(f => {
            const currentFields = isEdit ? (editOrg?.allowedFields || []) : newOrg.allowedFields;
            const selected = currentFields.includes(f);
            return (
              <div key={f} onClick={() => toggleField(f, isEdit)}
                style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: selected ? theme.accentGlow : theme.bg,
                  border: `1px solid ${selected ? theme.accent : theme.border}`,
                  color: selected ? theme.accent : theme.textSecondary,
                  fontSize: 13, fontWeight: selected ? 600 : 400, transition: 'all 0.15s' }}>
                {selected ? '✓ ' : ''}{f}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 8,
              border: `1px solid ${theme.border}`, background: 'transparent',
              color: theme.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={loading}
            style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none',
              background: theme.accent, color: 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Organization'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
            Service Organizations
          </h1>
          <p style={{ fontSize: 13, color: theme.textSecondary }}>
            Manage authorized organizations and their data access permissions
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background: theme.accent, color: 'white', border: 'none', borderRadius: 8,
            padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Register Organization
        </button>
      </div>

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
          background: msg.type === 'success' ? `${theme.success}15` : `${theme.danger}15`,
          border: `1px solid ${msg.type === 'success' ? theme.success : theme.danger}30`,
          color: msg.type === 'success' ? theme.success : theme.danger }}>
          {msg.type === 'success' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {orgs.length === 0 ? (
        <div style={{ background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`,
          padding: 48, textAlign: 'center', color: theme.textMuted, fontSize: 13 }}>
          No organizations registered yet. Click "Register Organization" to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {orgs.map(org => (
            <div key={org.orgId} style={{ background: theme.bgCard, borderRadius: 12,
              padding: 24, border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ background: theme.accentGlow, color: theme.accent, padding: 12, borderRadius: 12 }}>
                  <Building2 size={24} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditOrg({ ...org, allowedFields: parseFields(org.allowedFields) })}
                    style={{ background: theme.bgHover, border: `1px solid ${theme.border}`,
                      borderRadius: 6, padding: '6px 10px', color: theme.textSecondary,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(org)}
                    style={{ background: `${theme.danger}15`, border: `1px solid ${theme.danger}30`,
                      borderRadius: 6, padding: '6px 10px', color: theme.danger,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
                {org.orgName}
              </h3>
              <div style={{ fontSize: 12, color: theme.accent, fontFamily: theme.fontMono, marginBottom: 14 }}>
                {org.orgId}
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.textSecondary }}>
                  <Globe size={13} /> {org.sector}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.success }}>
                  <Shield size={13} /> Active
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${theme.borderLight}`, paddingTop: 16 }}>
                <div style={{ fontSize: 10, color: theme.textMuted, textTransform: 'uppercase',
                  marginBottom: 8, letterSpacing: '0.06em' }}>Authorized Fields</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parseFields(org.allowedFields).map(f => (
                    <span key={f} style={{ background: theme.bgHover, padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, color: theme.textSecondary, border: `1px solid ${theme.borderLight}` }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Register New Organization" isEdit={false}
          onSave={handleRegister} onClose={() => setShowAdd(false)} />
      )}
      {editOrg && (
        <Modal title={`Edit — ${editOrg.orgName}`} isEdit={true}
          onSave={handleEdit} onClose={() => setEditOrg(null)} />
      )}
    </div>
  );
}
