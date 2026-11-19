import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import { ROLES_SISTEMA } from '../utils/permisos';
import './PrioridadAlta.css';

export default function GestionUsuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // Formulario Crear / Actualizar
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('Encuestador / Digitador');
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await apiFetch('http://localhost:5000/api/usuarios');
      const data = await res.json();
      if (res.ok) {
        setUsuarios(data.usuarios || []);
      } else {
        setMensaje(`❌ ${data.error || 'No se pudieron cargar los usuarios.'}`);
      }
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');

    try {
      const res = await apiFetch('http://localhost:5000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, nombre, rol, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar usuario.');

      setMensaje(`✅ ${data.message}`);
      setRut('');
      setNombre('');
      setRol('Encuestador / Digitador');
      setPassword('');
      cargarUsuarios();
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleCargarParaEditar = (u) => {
    setRut(u.rut);
    setNombre(u.nombre);
    setRol(u.rol || 'Encuestador / Digitador');
    setPassword('');
    setMensaje(`✏️ Editando a ${u.nombre}. Ingresa una nueva clave para confirmar los cambios.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.nombre}" (${u.rut})?`)) return;

    try {
      const res = await apiFetch(`http://localhost:5000/api/usuarios/${encodeURIComponent(u.rut)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar.');

      setMensaje(`✅ ${data.message}`);
      cargarUsuarios();
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    }
  };

  return (
    <div className="prioridad-container">
      <Navbar />

      <main className="prioridad-main">
        <div className="prioridad-card">
          <div className="prioridad-top-bar">
            <button
              type="button"
              className="prioridad-btn-volver"
              onClick={() => navigate('/dashboard')}
            >
              ⬅ Volver al Panel
            </button>
          </div>

          <div className="prioridad-header">
            <h2>👥 Gestión de Usuarios y Perfiles del Sistema</h2>
            <p>Crea cuentas, asigna roles de acceso o actualiza credenciales de funcionarios DIDECO</p>
          </div>

          {mensaje && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontWeight: 'bold',
                backgroundColor: mensaje.includes('❌') ? '#fed7d7' : '#e6fffa',
                color: mensaje.includes('❌') ? '#9b2c2c' : '#234e52'
              }}
            >
              {mensaje}
            </div>
          )}

          {/* Formulario Crear / Editar */}
          <form
            onSubmit={handleGuardar}
            style={{
              backgroundColor: '#f7fafc',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '26px'
            }}
          >
            <h3 style={{ marginTop: 0, color: '#2d3748' }}>Crear o Actualizar Funcionario</h3>
            <div className="prioridad-filtros-grid">
              <input
                type="text"
                placeholder="RUT (Ej: 12345678-9) *"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="prioridad-input"
                required
              />
              <input
                type="text"
                placeholder="Nombre completo *"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="prioridad-input"
                required
              />
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="prioridad-select"
              >
                {ROLES_SISTEMA.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input
                type="password"
                placeholder="Contraseña (mín. 8 caracteres) *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="prioridad-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="prioridad-btn-ficha"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              {guardando ? 'Guardando...' : '💾 Guardar Usuario'}
            </button>
          </form>

          {/* Tabla de Usuarios */}
          {cargando ? (
            <p className="prioridad-estado-msg">Cargando usuarios...</p>
          ) : (
            <div className="prioridad-tabla-wrapper">
              <table className="prioridad-tabla">
                <thead>
                  <tr>
                    <th>RUT</th>
                    <th>Nombre Completo</th>
                    <th>Perfil / Rol Asignado</th>
                    <th className="th-centro">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.rut}>
                      <td className="td-rut">{u.rut}</td>
                      <td className="td-nombre">{u.nombre}</td>
                      <td>
                        <span className="prioridad-badge badge-baja">{u.rol}</span>
                      </td>
                      <td className="td-accion">
                        <button
                          type="button"
                          onClick={() => handleCargarParaEditar(u)}
                          className="prioridad-btn-ficha"
                          style={{ marginRight: '8px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(u)}
                          className="prioridad-btn-ficha"
                          style={{ backgroundColor: '#e53e3e' }}
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}