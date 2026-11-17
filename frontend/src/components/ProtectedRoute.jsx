import React from 'react';
import { Navigate } from 'react-router-dom';
import { haySesion } from '../api';

export default function ProtectedRoute({ children }) {
  // Hay sesión solo si existe un token y todavía no expira
  if (!haySesion()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}