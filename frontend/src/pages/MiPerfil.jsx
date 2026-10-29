import React, { useState } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './MiPerfil.css';

export default function MiPerfil() {
  const [usuario, setUsuario] = useState({
    nombre: 'José Martínez',
    rut: '19.876.543-2',
    depto: 'DIDECO - La Granja',
    cargo: 'Encuestador / Analista Territorial',
    email: 'jose.martinez@lagranja.cl',
    telefono: '+56 9 1234 5678',
    password: ''
  });

  const [mensaje, setMensaje] = useState('');

  const handleChange = (e) => {
    setUsuario({
      ...usuario,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí luego conectaremos con la API para actualizar en BD
    setMensaje('¡Información actualizada exitosamente!');
    setTimeout(() => setMensaje(''), 4000);
  };

  return (
    <div className="perfil-container">
      <Navbar usuario="José" />

      <main className="perfil-main">
        <div className="perfil-card">
          
          <div className="perfil-header">
            <div className="perfil-avatar">
              JM
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