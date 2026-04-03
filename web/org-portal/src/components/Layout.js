import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';
import { Grid, Users, FilePlus, Shield, LogOut, ExternalLink } from 'lucide-react';

export default function Layout({ onLogout }) {
    const navigate = useNavigate();
    const handleLogout = () => { onLogout(); navigate('/login'); };

    const navItemStyle = ({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500,
        color: isActive ? theme.accent : theme.textSecondary,
        background: isActive ? theme.accentGlow : 'transparent',
        borderLeft: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
        transition: 'all 0.15s', marginBottom: 4
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
            {/* Sidebar */}
            <div style={{ width: 260, background: theme.bgCard, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '32px 24px', borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: 12, color: theme.accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Service Partner</div>
                    <div style={{ fontSize: 18, color: theme.textPrimary, fontWeight: 700 }}>Org Identity Control</div>
                </div>

                <nav style={{ flex: 1, padding: 20 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingLeft: 12 }}>Navigation</div>
                    <NavLink to="/" style={navItemStyle}><Grid size={18} /> Dashboard</NavLink>
                    <NavLink to="/citizens" style={navItemStyle}><Users size={18} /> Citizen Registry</NavLink>

                    <div style={{ fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '24px 0 12px', paddingLeft: 12 }}>Blockchain</div>
                    <NavLink to="/audit" style={navItemStyle}><Shield size={18} /> Transaction Audit</NavLink>
                    <NavLink to="/verify" style={navItemStyle}><ExternalLink size={18} /> Verify Identity</NavLink>
                </nav>

                <div style={{ padding: 20, borderTop: `1px solid ${theme.border}` }}>
                    <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, border: 'none', background: 'transparent', color: theme.textSecondary, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <header style={{ height: 64, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.textMuted, fontSize: 12 }}>
                        <span style={{ fontFamily: theme.fontMono }}>SID: ORG-00124</span>
                        <div style={{ width: 1, height: 16, background: theme.border }} />
                        <span>Connected to identitychannel</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.success, fontSize: 12, fontWeight: 600 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.success }} /> NODE ONLINE
                    </div>
                </header>

                <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
