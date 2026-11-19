import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import Dashboard from './pages/dashboard';
import BusquedaRut from './pages/BusquedaRut';
import Informes from './pages/Informes';
import NuevaEncuesta from './pages/NuevaEncuesta';
import Graficos from './pages/Graficos';
import MiPerfil from './pages/MiPerfil';
import GestionUsuarios from './pages/GestionUsuarios';
import ProtectedRoute from './components/ProtectedRoute';
import PrioridadAlta from './pages/PrioridadAlta';
import { tienePermiso, rutaInicioPorRol } from './utils/permisos';

function RutaConPermiso({ permiso, children }) {
  if (!tienePermiso(permiso)) {
    return <Navigate to={rutaInicioPorRol()} replace />;
  }
  return children;
}

function RedireccionInicio() {
  return <Navigate to={rutaInicioPorRol()} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas con Control por Perfil */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="ver_dashboard">
                <Dashboard />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/graficos"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="ver_dashboard">
                <Graficos />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/busqueda-rut"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="buscar_rut">
                <BusquedaRut />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/informes"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="informes_ver">
                <Informes />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route path="/generar-informe" element={<Navigate to="/informes" replace />} />
        <Route
          path="/nueva-encuesta"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="crear_encuesta">
                <NuevaEncuesta />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prioridad-alta"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="buscar_rut">
                <PrioridadAlta />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vulnerabilidad-moderada"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="buscar_rut">
                <PrioridadAlta categoria="moderada" />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vulnerabilidad-baja"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="buscar_rut">
                <PrioridadAlta categoria="baja" />
              </RutaConPermiso>
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute>
              <RutaConPermiso permiso="gestionar_usuarios">
                <GestionUsuarios />
              </RutaConPermiso>
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
          path="/mi-perfil"
          element={
            <ProtectedRoute>
              <MiPerfil />
            </ProtectedRoute>
          }
        />

        {/* Cualquier otra ruta desconocida redirige según el perfil */}
        <Route path="*" element={<RedireccionInicio />} />
      </Routes>
    </Router>
  );
}