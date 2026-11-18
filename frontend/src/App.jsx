import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import Dashboard from './pages/dashboard';
import BusquedaRut from './pages/BusquedaRut';
import Informes from './pages/Informes';
import NuevaEncuesta from './pages/NuevaEncuesta';
import MiPerfil from './pages/MiPerfil';
import ProtectedRoute from './components/ProtectedRoute';
import PrioridadAlta from './pages/PrioridadAlta';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas (Protegidas) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/busqueda-rut" 
          element={
            <ProtectedRoute>
              <BusquedaRut />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/informes"
          element={
            <ProtectedRoute>
              <Informes />
            </ProtectedRoute>
          }
        />
        <Route path="/generar-informe" element={<Navigate to="/informes" replace />} />
        <Route 
          path="/nueva-encuesta" 
          element={
            <ProtectedRoute>
              <NuevaEncuesta />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/perfil" 
          element={
            <ProtectedRoute>
              <MiPerfil />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prioridad-alta" 
          element={
            <ProtectedRoute>
              <PrioridadAlta />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vulnerabilidad-moderada" 
          element={
            <ProtectedRoute>
              <PrioridadAlta categoria="moderada" />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/vulnerabilidad-baja" 
          element={
            <ProtectedRoute>
              <PrioridadAlta categoria="baja" />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mi-perfil" 
          element={
            <ProtectedRoute>
              <MiPerfil />
            </ProtectedRoute>
          }
           
        />

        {/* Cualquier otra ruta desconocida redirige a Login */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}