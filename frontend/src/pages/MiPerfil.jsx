import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './MiPerfil.css';

export default function MiPerfil() {
  const [usuario, setUsuario] = useState({
    nombre: '',
    rut: '',
    depto: 'DIDECO - La Granja',
    cargo: '',
    email: '',
    telefono: '',
    password: ''
  });

  const [mensaje, setMensaje] = useState('');

  // 🚀 Cargar datos del usuario logueado desde localStorage al montar el componente
  useEffect(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (usuarioGuardado.rut) {
      // Generar email institucional a partir del nombre si no viene en el objeto
      const primerNombre = usuarioGuardado.nombre ? usuarioGuardado.nombre.split(' ')[0].toLowerCase() : 'usuario';
      const primerApellido = usuarioGuardado.nombre && usuarioGuardado.nombre.split(' ')[1] 
        ? usuarioGuardado.nombre.split(' ')[1].toLowerCase() 
        : 'dideco';

      setUsuario(prev => ({
        ...prev,
        nombre: usuarioGuardado.nombre || 'Funcionario Municipal',
        rut: usuarioGuardado.rut || '',
        cargo: usuarioGuardado.cargo || 'Funcionario DIDECO',
        email: `${primerNombre}.${primerApellido}@lagranja.cl`,
        telefono: '+56 9 1234 5678'
      }));
    }
  }, []);

  // 🎨 Generar iniciales dinámicas para el avatar (Ej: Felipe Ponce -> FP)
  const getIniciales = (nombre) => {
    if (!nombre) return 'US';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
  };

  const handleChange = (e) => {
    setUsuario({
      ...usuario,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Actualizar también en el localStorage para mantener coherencia
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nuevoUsuarioGuardado = {
      ...usuarioGuardado,
      nombre: usuario.nombre
    };
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuarioGuardado));

    setMensaje('¡Información actualizada exitosamente!');
    setTimeout(() => setMensaje(''), 4000);
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

          {mensaje && <div className="alert-success">{mensaje}</div>}

          <form onSubmit={handleSubmit}>
            <div className="perfil-form-grid">
              
              <div className="perfil-field">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  name="nombre" 
                  value={usuario.nombre} 
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="perfil-field">
                <label>RUT (No editable)</label>
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

              <div className="perfil-field">
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  name="email" 
                  value={usuario.email} 
                  onChange={handleChange}
                  required 
                />
              </div>

              <div className="perfil-field">
                <label>Teléfono de Contacto</label>
                <input 
                  type="text" 
                  name="telefono" 
                  value={usuario.telefono} 
                  onChange={handleChange} 
                />
              </div>

              <div className="perfil-field full-width">
                <label>Nueva Contraseña (dejar en blanco si no deseas cambiarla)</label>
                <input 
                  type="password" 
                  name="password" 
                  value={usuario.password} 
                  onChange={handleChange}
                  placeholder="••••••••" 
                />
              </div>

            </div>

            <div className="perfil-actions">
              <button type="submit" className="btn-guardar">
                Guardar Cambios
              </button>
            </div>
          </form>

        </div>
      </main>

      <Footer />
    </div>
  );
}