import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import Dashboard from './pages/dashboard';
import BusquedaRut from './pages/BusquedaRut';
import BusquedaFranja from './pages/BusquedaFranja';
import NuevaEncuesta from './pages/NuevaEncuesta';
import MiPerfil from './pages/MiPerfil'; // <- Import nuevo

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/busqueda-rut" element={<BusquedaRut />} />
        <Route path="/busqueda-franja" element={<BusquedaFranja />} />
        <Route path="/nueva-encuesta" element={<NuevaEncuesta />} />
        <Route path="/perfil" element={<MiPerfil />} /> {/* <- Ruta nueva */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}