import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import API from '../api';
import { theme } from '../styles/theme';

const NavItem = ({ to, icon, label, badge }) => (
    <NavLink to={to} style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500,
        color: isActive ? theme.accent : theme.textSecondary,
        background: isActive ? theme.accentGlow : 'transparent',
        borderLeft: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
        transition: 'all 0.15s', marginBottom: 2, position: 'relative'
    })}>
        <span style={{ opacity: 0.9 }}>{icon}</span>
        <span>{label}</span>
        {badge > 0 && (
            <span style={{
                marginLeft: 'auto', background: theme.danger, color: 'white',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600
            }}>
                {badge}
            </span>
        )}
    </NavLink>
);

export default function Layout({ onLogout }) {
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);

    useEffect(() => {
        API.get('/api/registration/pending').then(res => {
            setPendingCount(res.data.registrations?.filter(r => r.status === 'PENDING').length || 0);
        }).catch(() => { });
        API.get('/api/registration/notifications').then(res => {
            setNotifCount(res.data.notifications?.filter(n => !n.isRead).length || 0);
        }).catch(() => { });
    }, []);

    const handleLogout = () => { onLogout(); navigate('/login'); };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
            {/* Sidebar */}
            <div style={{
                width: 240, background: theme.bgCard, borderRight: `1px solid ${theme.border}`,
                display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0
            }}>

                {/* Logo */}
                <div style={{ padding: '24px 20px', borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{
                        fontSize: 13, color: theme.accent, fontWeight: 600,
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4
                    }}>
                        Digital Identity
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, letterSpacing: '0.05em' }}>
                        Admin Control Panel
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
                    <div style={{
                        fontSize: 10, color: theme.textMuted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '0 4px', marginBottom: 8
                    }}>Overview</div>
                    <NavItem to="/" icon={<GridIcon />} label="Dashboard" />

                    <div style={{
                        fontSize: 10, color: theme.textMuted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '0 4px', margin: '16px 0 8px'
                    }}>Identity</div>
                    <NavItem to="/registrations" icon={<ClipboardIcon />} label="Registrations" badge={pendingCount} />
                    <NavItem to="/citizens" icon={<UsersIcon />} label="Citizens" />
                    <NavItem to="/organizations" icon={<BuildingIcon />} label="Organizations" />

                    <div style={{
                        fontSize: 10, color: theme.textMuted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '0 4px', margin: '16px 0 8px'
                    }}>Security</div>
                    <NavItem to="/biometric" icon={<FingerprintIcon />} label="Biometric Enroll" />
                    <NavItem to="/audit" icon={<ShieldIcon />} label="Audit Log" />

                    <div style={{
                        fontSize: 10, color: theme.textMuted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '0 4px', margin: '16px 0 8px'
                    }}>Analytics</div>
                    <NavItem to="/evaluation" icon={<ChartIcon />} label="Evaluation" />
                </nav>

                {/* Footer */}
                <div style={{ padding: '16px 12px', borderTop: `1px solid ${theme.border}` }}>
                    <button onClick={handleLogout}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'transparent', color: theme.textSecondary, fontSize: 14,
                            fontWeight: 500, transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogoutIcon /> Logout
                    </button>
                </div>
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Topbar */}
                <div style={{
                    height: 56, background: theme.bgCard, borderBottom: `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 28px', flexShrink: 0
                }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
                        Sri Lanka National Digital Identity System
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', background: theme.success,
                            boxShadow: `0 0 8px ${theme.success}`
                        }} />
                        <span style={{ fontSize: 12, color: theme.textSecondary }}>System Online</span>
                        <div style={{ width: 1, height: 20, background: theme.border }} />
                        <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
                            ADMIN
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

// SVG Icons
const GridIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const UsersIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const BuildingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const ShieldIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const FingerprintIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" /><path d="M5 19.5C5.5 18 6 15 6 12c0-3.3 2.7-6 6-6" /><path d="M17.5 21C17 19.5 16 17.5 16 12c0-1.7-.7-3.3-1.8-4.5" /><path d="M22 12c0 3-1 6-2 8" /><path d="M12 12c0 3-1 6-2 9" /></svg>;
const ChartIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
const ClipboardIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
