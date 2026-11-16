import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './MiPerfil.css';

export default function MiPerfil() {
  const [usuario, setUsuario] = useState({
    nombre: '',
    rut: '',
    depto: 'DIDECO - La Granja',
    cargo: ''
  });

  // Cargar datos reales del usuario logueado desde localStorage
  useEffect(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (usuarioGuardado.rut) {
      setUsuario({
        nombre: usuarioGuardado.nombre || 'Funcionario Municipal',
        rut: usuarioGuardado.rut || '',
        depto: usuarioGuardado.depto || 'DIDECO - La Granja',
        cargo: usuarioGuardado.cargo || 'Funcionario DIDECO'
      });
    }
  }, []);

  // Generar iniciales dinámicas para el avatar (Ej: Felipe Ponce -> FP)
  const getIniciales = (nombre) => {
    if (!nombre) return 'US';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="perfil-container">
      <Navbar />

      <main className="perfil-main">
        <div className="perfil-card">
          
          <div className="perfil-header">
            <div className="perfil-avatar">
              {getIniciales(usuario.nombre)}
            </div>
            <div className="perfil-title-info">
              <h2>{usuario.nombre}</h2>
              <p>{usuario.cargo} — <strong>{usuario.depto}</strong></p>
            </div>
          </div>

          <div className="perfil-form-grid">
            
            <div className="perfil-field">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                value={usuario.nombre} 
                disabled 
              />
            </div>

            <div className="perfil-field">
              <label>RUT</label>
              <input 
                type="text" 
                value={usuario.rut} 
                disabled 
              />
            </div>

            <div className="perfil-field">
              <label>Unidad / Departamento</label>
              <input 
                type="text" 
                value={usuario.depto} 
                disabled 
              />
            </div>

            <div className="perfil-field">
              <label>Cargo Municipal</label>
              <input 
                type="text" 
                value={usuario.cargo} 
                disabled 
              />
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}