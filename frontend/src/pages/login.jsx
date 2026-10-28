import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Intentando iniciar sesión con:", { rut, password });
    
    // REDIRECCIÓN DIRECTA AL DASHBOARD
    navigate('/dashboard');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          🏢
        </div>
        <h2 style={styles.title}>DIDECO - La Granja</h2>
        <p style={styles.subtitle}>Sistema de Encuestas Adulto Mayor</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>RUT Funcionario</label>
            <input
              type="text"
              placeholder="12.345.678-K"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button}>
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center'
  },
  iconContainer: {
    fontSize: '3rem',
    marginBottom: '1rem',
    color: '#2563eb'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1e293b',
    fontWeight: '700'
  },
  subtitle: {
    margin: '0.4rem 0 1.5rem 0',
    fontSize: '0.9rem',
    color: '#64748b'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    textAlign: 'left'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#334155',
    fontWeight: '600',
    marginBottom: '0.4rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  button: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '0.85rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem'
  }
};