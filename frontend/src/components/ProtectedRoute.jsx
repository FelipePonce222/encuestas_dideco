import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Verificamos si existe un usuario en localStorage
  const usuario = localStorage.getItem('usuario');

  if (!usuario) {
    // Si no hay sesión, redirigimos inmediatamente al Login
    return <Navigate to="/" replace />;
  }

  // Si hay sesión activa, mostramos la vista solicitada
  return children;
}