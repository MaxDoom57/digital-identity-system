import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Citizens from './pages/Citizens';
import Organizations from './pages/Organizations';
import AuditLog from './pages/AuditLog';
import BiometricEnroll from './pages/BiometricEnroll';
import Evaluation from './pages/Evaluation';
import Registrations from './pages/Registrations';
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
          <Route path="registrations" element={<Registrations />} />
          <Route path="citizens" element={<Citizens />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="biometric" element={<BiometricEnroll />} />
          <Route path="evaluation" element={<Evaluation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
