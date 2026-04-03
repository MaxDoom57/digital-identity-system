import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

export default function Layout({ onLogout, citizenData }) {
    const navigate = useNavigate();
    const handleLogout = () => { onLogout(); navigate('/login'); };

    const NavItem = ({ to, icon, label, end }) => (
        <NavLink to={to} end={end} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500,
            color: isActive ? theme.accent : theme.textSecondary,
            background: isActive ? theme.accentGlow : 'transparent',
            borderLeft: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
            transition: 'all 0.15s', marginBottom: 2
        })}>
            {icon}<span>{label}</span>
        </NavLink>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
            {/* Sidebar */}
            <div style={{
                width: 240, background: theme.bgCard,
                borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '24px 20px', borderBottom: `1px solid ${theme.border}` }}>
                    <div style={{
                        fontSize: 13, color: theme.accent, fontWeight: 600,
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4
                    }}>
                        Digital Identity
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>Citizen Portal</div>
                    {citizenData && (
                        <div style={{
                            marginTop: 12, padding: '8px 12px', background: theme.bg,
                            borderRadius: 6, border: `1px solid ${theme.borderLight}`
                        }}>
                            <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 2 }}>Logged in as</div>
                            <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 500 }}>
                                {citizenData.fullName}
                            </div>
                            <div style={{ fontSize: 11, color: theme.accent, fontFamily: theme.fontMono, marginTop: 2 }}>
                                {citizenData.citizenId}
                            </div>
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1, padding: '16px 12px' }}>
                    <div style={{
                        fontSize: 10, color: theme.textMuted, letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '0 4px', marginBottom: 8
                    }}>My Identity</div>
                    <NavItem to="/" end icon={<DashboardIcon />} label="Dashboard" />
                    <NavItem to="/identity" icon={<IdIcon />} label="My Identity" />
                    <NavItem to="/consent" icon={<ShieldIcon />} label="Consent Manager" />
                    <NavItem to="/offline-token" icon={<QrIcon />} label="Offline Token" />
                    <NavItem to="/history" icon={<HistoryIcon />} label="Access History" />
                </nav>

                <div style={{ padding: '16px 12px', borderTop: `1px solid ${theme.border}` }}>
                    <button onClick={handleLogout}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'transparent', color: theme.textSecondary, fontSize: 14, fontWeight: 500
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogoutIcon /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                    height: 56, background: theme.bgCard,
                    borderBottom: `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 28px', flexShrink: 0
                }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.fontMono }}>
                        Sri Lanka National Digital Identity System
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', background: theme.success,
                            boxShadow: `0 0 8px ${theme.success}`
                        }} />
                        <span style={{ fontSize: 12, color: theme.textSecondary }}>Secure Connection</span>
                    </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

const DashboardIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const IdIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 10h2M16 14h2M7 10h1v4H7" /></svg>;
const ShieldIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const LogoutIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const QrIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18v2" /></svg>;
const HistoryIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
