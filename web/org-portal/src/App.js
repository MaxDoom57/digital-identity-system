import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SetupPassword from './pages/SetupPassword';
import Dashboard from './pages/Dashboard';
import CitizensList from './pages/CitizensList';
import AddRecord from './pages/AddRecord';
import AuditLog from './pages/AuditLog';
import VerifyIdentity from './pages/VerifyIdentity';
import ConsentRequests from './pages/ConsentRequests';
import Layout from './components/Layout';

// Decode JWT payload without verifying signature (client-side only)
function decodeToken(t) {
  try { return JSON.parse(atob(t.split('.')[1])); } catch { return {}; }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const mustChange = token ? decodeToken(token).mustChangePassword === true : false;

  const handleLogin = (t) => { localStorage.setItem('token', t); setToken(t); };
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); };
  // Called after password is changed — replaces token and clears the gate
  const handlePasswordSet = (newToken) => { localStorage.setItem('token', newToken); setToken(newToken); };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />

        {/* First-time password setup gate */}
        <Route path="/setup-password" element={
          !token ? <Navigate to="/login" /> :
          mustChange ? <SetupPassword onComplete={handlePasswordSet} /> :
          <Navigate to="/" />
        } />

        {/* Main app — redirect to setup if mustChangePassword */}
        <Route path="/" element={
          !token ? <Navigate to="/login" /> :
          mustChange ? <Navigate to="/setup-password" /> :
          <Layout onLogout={handleLogout} />
        }>
          <Route index element={<Dashboard />} />
          <Route path="citizens" element={<CitizensList />} />
          <Route path="add-record/:citizenId" element={<AddRecord />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="verify" element={<VerifyIdentity />} />
          <Route path="consent-requests" element={<ConsentRequests />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
