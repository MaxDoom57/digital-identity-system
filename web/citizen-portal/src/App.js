import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyIdentity from './pages/MyIdentity';
import ConsentManager from './pages/ConsentManager';
import OfflineToken from './pages/OfflineToken';
import AccessHistory from './pages/AccessHistory';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [citizenData, setCitizenData] = useState(
    JSON.parse(localStorage.getItem('citizenData') || 'null')
  );

  const handleLogin = (t, citizen) => {
    localStorage.setItem('token', t);
    localStorage.setItem('citizenData', JSON.stringify(citizen));
    setToken(t);
    setCitizenData(citizen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('citizenData');
    setToken(null);
    setCitizenData(null);
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Layout onLogout={handleLogout} citizenData={citizenData} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard citizenData={citizenData} />} />
          <Route path="identity" element={<MyIdentity />} />
          <Route path="consent" element={<ConsentManager />} />
          <Route path="offline-token" element={<OfflineToken />} />
          <Route path="history" element={<AccessHistory />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
