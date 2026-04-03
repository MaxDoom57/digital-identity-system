import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CitizensList from './pages/CitizensList';
import AddRecord from './pages/AddRecord';
import AuditLog from './pages/AuditLog';
import VerifyIdentity from './pages/VerifyIdentity';
import Layout from './components/Layout';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const handleLogin = (t) => { localStorage.setItem('token', t); setToken(t); };
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="citizens" element={<CitizensList />} />
          <Route path="add-record/:citizenId" element={<AddRecord />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="verify" element={<VerifyIdentity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
