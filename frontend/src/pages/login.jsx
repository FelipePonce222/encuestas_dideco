import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

export default function Login() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, password })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        localStorage.setItem('usuario', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setErrorMsg(data.message || 'Error en las credenciales.');
      }
    } catch (err) {
      setErrorMsg('❌ No se pudo conectar con el servidor Flask.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon-container">🏢</div>
        <h2 className="login-title">DIDECO - La Granja</h2>
        <p className="login-subtitle">Sistema de Encuestas Adulto Mayor</p>

        {errorMsg && (
          <div className="login-alert-error">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-label">RUT Funcionario</label>
            <input
              type="text"
              placeholder="Ej: 21555499-6"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <div className="login-input-group">
            <label className="login-label">Contraseña</label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}