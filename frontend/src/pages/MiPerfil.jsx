import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { API_URL } from '../config';
import { apiFetch, actualizarUsuario, actualizarToken } from '../api';
import './MiPerfil.css';

const DEPTO = 'DIDECO - La Granja';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function MiPerfil() {
  // --- Datos del perfil ---
  const [perfil, setPerfil] = useState({ rut: '', nombre: '', cargo: '', email: '', telefono: '' });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);          // { tipo: 'ok' | 'error', texto }
  const [erroresPerfil, setErroresPerfil] = useState({});

  // --- Cambio de contraseña ---
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetir: '' });
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState(null);
  const [erroresClave, setErroresClave] = useState({});

  // Cargar el perfil desde el servidor (datos reales, no del navegador)
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const respuesta = await apiFetch(`${API_URL}/api/perfil`);
        if (!respuesta.ok) throw new Error('perfil');
        const datos = await respuesta.json();
        if (activo) setPerfil(datos);
      } catch {
        if (activo) setErrorCarga('No se pudo cargar tu perfil. Intenta nuevamente.');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPerfil(prev => ({ ...prev, [name]: value }));
    setErroresPerfil(prev => ({ ...prev, [name]: undefined }));
  };

  const handleChangeClave = (e) => {
    const { name, value } = e.target;
    setClaves(prev => ({ ...prev, [name]: value }));
    setErroresClave(prev => ({ ...prev, [name]: undefined }));
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setMensaje(null);
    setErroresPerfil({});

    try {
      const respuesta = await apiFetch(`${API_URL}/api/perfil`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ nombre: perfil.nombre, email: perfil.email, telefono: perfil.telefono })
      });
      const data = await respuesta.json().catch(() => ({}));

      if (respuesta.ok) {
        setPerfil(data.perfil);
        actualizarUsuario({ nombre: data.perfil.nombre });   // el menú superior muestra el nombre nuevo
        setMensaje({ tipo: 'ok', texto: data.message });
      } else {
        setErroresPerfil(data.errores || {});
        setMensaje({ tipo: 'error', texto: data.message || 'No se pudieron guardar los cambios.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarClave = async (e) => {
    e.preventDefault();
    if (cambiandoClave) return;
    setMensajeClave(null);
    setErroresClave({});

    if (claves.nueva !== claves.repetir) {
      setErroresClave({ repetir: 'Las contraseñas no coinciden.' });
      setMensajeClave({ tipo: 'error', texto: 'Revisa los datos ingresados.' });
      return;
    }

    setCambiandoClave(true);
    try {
      const respuesta = await apiFetch(`${API_URL}/api/perfil/password`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password_actual: claves.actual, password_nueva: claves.nueva })
      });
      const data = await respuesta.json().catch(() => ({}));

      if (respuesta.ok) {
        actualizarToken(data);   // el servidor entrega un token nuevo para que esta sesión continúe
        setClaves({ actual: '', nueva: '', repetir: '' });
        setMensajeClave({ tipo: 'ok', texto: data.message });
      } else {
        setErroresClave(data.errores || {});
        setMensajeClave({ tipo: 'error', texto: data.message || 'No se pudo cambiar la contraseña.' });
      }
    } catch {
      setMensajeClave({ tipo: 'error', texto: 'Error de conexión con el servidor.' });
    } finally {
      setCambiandoClave(false);
    }
  };

  // Iniciales para el avatar (Ej: Felipe Ponce -> FP)
  const getIniciales = (nombre) => {
    if (!nombre) return 'US';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    return partes[0].slice(0, 2).toUpperCase();
  };

  const alerta = (m) => m && (
    <div className={m.tipo === 'ok' ? 'alert-success' : 'alert-error'}>{m.texto}</div>
  );
  const errorCampo = (errores, campo) => errores[campo] && (
    <small className="perfil-error-campo">{errores[campo]}</small>
  );

  return (
    <div className="perfil-container">
      <Navbar />

      <main className="perfil-main">
        <div className="perfil-card">

          {cargando && <p>Cargando tu perfil...</p>}
          {!cargando && errorCarga && <div className="alert-error">{errorCarga}</div>}

          {!cargando && !errorCarga && (
            <>
              <div className="perfil-header">
                <div className="perfil-avatar">{getIniciales(perfil.nombre)}</div>
                <div className="perfil-title-info">
                  <h2>{perfil.nombre}</h2>
                  <p>{perfil.cargo || 'Funcionario DIDECO'} — <strong>{DEPTO}</strong></p>
                </div>
              </div>

              {alerta(mensaje)}

              <form onSubmit={guardarPerfil}>
                <div className="perfil-form-grid">
                  <div className="perfil-field">
                    <label htmlFor="perfil-nombre">Nombre Completo</label>
                    <input id="perfil-nombre" type="text" name="nombre" value={perfil.nombre}
                           onChange={handleChange} required maxLength={100} />
                    {errorCampo(erroresPerfil, 'nombre')}
                  </div>

                  <div className="perfil-field">
                    <label>RUT (No editable)</label>
                    <input type="text" value={perfil.rut} disabled />
                  </div>

                  <div className="perfil-field">
                    <label>Unidad / Departamento</label>
                    <input type="text" value={DEPTO} disabled />
                  </div>

                  <div className="perfil-field">
                    <label>Cargo Municipal (lo administra DIDECO)</label>
                    <input type="text" value={perfil.cargo} disabled />
                  </div>

                  <div className="perfil-field">
                    <label htmlFor="perfil-email">Correo Electrónico</label>
                    <input id="perfil-email" type="email" name="email" value={perfil.email}
                           onChange={handleChange} autoComplete="email" maxLength={120}
                           placeholder="nombre@dominio.cl" />
                    {errorCampo(erroresPerfil, 'email')}
                  </div>

                  <div className="perfil-field">
                    <label htmlFor="perfil-telefono">Teléfono de Contacto</label>
                    <input id="perfil-telefono" type="tel" name="telefono" value={perfil.telefono}
                           onChange={handleChange} autoComplete="tel" placeholder="+56 9 1234 5678" />
                    {errorCampo(erroresPerfil, 'telefono')}
                  </div>
                </div>

                <div className="perfil-actions">
                  <button type="submit" className="btn-guardar" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>

              <section className="perfil-seccion">
                <h3>Cambiar contraseña</h3>
                <p className="ayuda">
                  Mínimo 8 caracteres, sin espacios al inicio o al final y sin tu RUT.
                  Al cambiarla, tus otras sesiones abiertas se cerrarán.
                </p>

                {alerta(mensajeClave)}

                <form onSubmit={cambiarClave}>
                  <div className="perfil-form-grid">
                    <div className="perfil-field full-width">
                      <label htmlFor="clave-actual">Contraseña actual</label>
                      <input id="clave-actual" type="password" name="actual" value={claves.actual}
                             onChange={handleChangeClave} autoComplete="current-password" required />
                      {errorCampo(erroresClave, 'password_actual')}
                    </div>

                    <div className="perfil-field">
                      <label htmlFor="clave-nueva">Nueva contraseña</label>
                      <input id="clave-nueva" type="password" name="nueva" value={claves.nueva}
                             onChange={handleChangeClave} autoComplete="new-password" required />
                      {errorCampo(erroresClave, 'password_nueva')}
                    </div>

                    <div className="perfil-field">
                      <label htmlFor="clave-repetir">Repite la nueva contraseña</label>
                      <input id="clave-repetir" type="password" name="repetir" value={claves.repetir}
                             onChange={handleChangeClave} autoComplete="new-password" required />
                      {errorCampo(erroresClave, 'repetir')}
                    </div>
                  </div>

                  <div className="perfil-actions">
                    <button type="submit" className="btn-guardar" disabled={cambiandoClave}>
                      {cambiandoClave ? 'Cambiando...' : 'Cambiar contraseña'}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}