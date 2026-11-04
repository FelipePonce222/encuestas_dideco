import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './BusquedaRut.css';

export default function BusquedaRut() {
  const navigate = useNavigate();
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [vecino, setVecino] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!rutBusqueda.trim()) return;

    setCargando(true);
    setError('');
    setVecino(null);
    setMostrarDetalle(false);

    try {
      const response = await fetch(`http://localhost:5000/api/vecino/${rutBusqueda.trim()}`);
      
      if (!response.ok) {
        throw new Error('Vecino no encontrado en los registros.');
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

  // Helper para leer del JSON datos_completos o encuesta_detalle
  const detalle = vecino?.encuesta_detalle || {};

  return (
    <div className="busqueda-container">
      <Navbar/>

      <main className="busqueda-main">
        <div className="busqueda-card">

          {/* Botón superior de regreso al Dashboard */}
          <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-start' }}>
            <button 
              type="button"
              onClick={() => navigate('/dashboard')} 
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: '#f8f9fa',
                fontWeight: 'bold',
                color: '#495057'
              }}
            >
              ⬅ Volver
            </button>
          </div>

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

              {/* BOTÓN PARA DESPLEGAR / OCULTAR EL DETALLE DE 55 PREGUNTAS */}
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setMostrarDetalle(!mostrarDetalle)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#4a5568',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {mostrarDetalle ? '▲ Ocultar Ficha Completa' : '📋 Ver Ficha Completa (54+ preguntas)'}
                </button>
              </div>

              {/* SECCIÓN DESPLEGABLE CON LOS DATOS COMPLETOS DE LA ENCUESTA */}
              {mostrarDetalle && (
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'left'
                }}>
                  <h4 style={{ color: '#2b6cb0', marginTop: 0, borderBottom: '1px solid #cbd5e0', paddingBottom: '5px' }}>
                    🩺 Antecedentes de Salud y Funcionalidad
                  </h4>
                  <p><strong>Centro de Salud:</strong> {detalle.salud_centro_nombre || 'No registrado'} ({detalle.salud_centro_comuna || 'N/A'})</p>
                  <p><strong>Patologías:</strong> {Array.isArray(detalle.patologias) && detalle.patologias.length > 0 ? detalle.patologias.join(', ') : 'Ninguna declarada'} {detalle.patologias_otra ? `(${detalle.patologias_otra})` : ''}</p>
                  <p><strong>Tratamiento:</strong> {detalle.patologias_tratamiento || 'No informa'}</p>
                  <p><strong>Discapacidad / Credencial:</strong> {detalle.discapacidad_aplica === 'Sí' ? `${detalle.discapacidad_tipo} - Credencial: ${detalle.discapacidad_credencial}` : 'No presenta'}</p>
                  <p><strong>Ayuda Técnica:</strong> {detalle.ayuda_tecnica_aplica} {detalle.ayuda_tecnica_detalle ? `(${detalle.ayuda_tecnica_detalle})` : ''}</p>

                  <h4 style={{ color: '#2b6cb0', marginTop: '20px', borderBottom: '1px solid #cbd5e0', paddingBottom: '5px' }}>
                    🏠 Vivienda y Entorno Habitacional
                  </h4>
                  <p><strong>Situación Habitacional:</strong> {detalle.situacion_habitacional || 'No informa'}</p>
                  <p><strong>Material Predominante:</strong> {detalle.material_predominante || 'No informa'}</p>
                  <p><strong>Estado General Vivienda:</strong> {detalle.estado_vivienda || 'No informa'}</p>
                  <p><strong>Revisión Eléctrica:</strong> {detalle.revision_electrica || 'No informa'}</p>
                  <p><strong>Alimentación (veces al día):</strong> {detalle.alimentacion_frecuencia || 'No informa'}</p>

                  <h4 style={{ color: '#2b6cb0', marginTop: '20px', borderBottom: '1px solid #cbd5e0', paddingBottom: '5px' }}>
                    🤝 Redes de Apoyo y Cuidados
                  </h4>
                  <p><strong>Convivientes en hogar:</strong> {detalle.convivientes_cantidad || '1'} persona(s)</p>
                  <p><strong>Frecuencia de Visitas:</strong> {detalle.frecuencia_visitas || 'No informa'}</p>
                  <p><strong>¿Recibe cuidados?:</strong> {detalle.recibe_cuidados} {Array.isArray(detalle.recibe_cuidados_quien) && detalle.recibe_cuidados_quien.length > 0 ? `(${detalle.recibe_cuidados_quien.join(', ')})` : ''}</p>
                  <p><strong>Organizaciones / Programas:</strong> {detalle.programa_social === 'Sí' ? detalle.programa_social_detalle : 'Ninguno'}</p>

                  <h4 style={{ color: '#2b6cb0', marginTop: '20px', borderBottom: '1px solid #cbd5e0', paddingBottom: '5px' }}>
                    📝 Observaciones de Campo
                  </h4>
                  <p style={{ fontStyle: 'italic', background: '#fff', padding: '10px', borderRadius: '5px', border: '1px solid #edf2f7' }}>
                    "{detalle.observaciones || vecino.observaciones || 'Sin observaciones registradas.'}"
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}