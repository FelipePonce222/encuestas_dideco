import React, { useState } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './BusquedaRut.css';

export default function BusquedaRut() {
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [vecino, setVecino] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!rutBusqueda.trim()) return;

    setCargando(true);
    setError('');
    setVecino(null);

    try {
      const response = await fetch(`http://localhost:5000/api/vecino/${rutBusqueda.trim()}`);
      
      if (!response.ok) {
        throw new Error('Vecino no encontrado en los registros de Franja 1');
      }

      const data = await response.json();
      setVecino(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const getNivelColor = (nivel) => {
    switch (nivel) {
      case 'Vulnerabilidad Crítica': return '#e53e3e';
      case 'Vulnerabilidad Alta': return '#dd6b20';
      case 'Vulnerabilidad Moderada': return '#d69e2e';
      case 'Vulnerabilidad Baja': return '#38a169';
      default: return '#718096';
    }
  };

  return (
    <div className="busqueda-container">
      <Navbar usuario="José" />

      <main className="busqueda-main">
        <div className="busqueda-card">
          <h2>Búsqueda de Vecino por RUT</h2>
          <p className="busqueda-subtitle">Consulta los datos históricos y nivel de vulnerabilidad IVPM</p>

          <form onSubmit={handleBuscar} className="busqueda-form">
            <input
              type="text"
              placeholder="Ej: 12345678-9 o 12.345.678"
              value={rutBusqueda}
              onChange={(e) => setRutBusqueda(e.target.value)}
              className="busqueda-input"
            />
            <button type="submit" className="busqueda-btn" disabled={cargando}>
              {cargando ? 'Buscando...' : 'Buscar RUT'}
            </button>
          </form>

          {error && <div className="busqueda-error">{error}</div>}

          {vecino && (
            <div className="resultado-card">
              <div className="resultado-header">
                <h3>{vecino.nombre}</h3>
                <span 
                  className="badge-nivel" 
                  style={{ backgroundColor: getNivelColor(vecino.nivel_riesgo) }}
                >
                  {vecino.nivel_riesgo}
                </span>
              </div>

              <div className="resultado-grid">
                <div><strong>RUT:</strong> {vecino.rut}</div>
                <div><strong>Edad:</strong> {vecino.edad || 'No registrada'} años</div>
                <div><strong>Dirección:</strong> {vecino.direccion}</div>
                <div><strong>Unidad Vecinal:</strong> {vecino.unidad_vecinal}</div>
                <div><strong>Territorio:</strong> {vecino.franja}</div>
                <div><strong>Estado Visita:</strong> {vecino.hallazgo}</div>
              </div>

              <div className="ivpm-score-box">
                <span className="score-label">Puntaje Global IVPM:</span>
                <span className="score-value">
                  {vecino.ivpm_score !== null ? `${vecino.ivpm_score} / 100 pts` : 'N/A (Sin contacto/No aplica)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}