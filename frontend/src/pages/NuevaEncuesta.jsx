import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './BusquedaRut.css';

export default function BusquedaRut() {
  const [rutBusqueda, setRutBusqueda] = useState('');
  const [encuestaBuscada, setEncuestaBuscada] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  // 1. Cargar las 10 encuestas más recientes al montar la vista
  useEffect(() => {
    cargarRecientes();
  }, []);

  const cargarRecientes = () => {
    fetch('http://localhost:5000/api/encuestas/recientes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRecientes(data);
      })
      .catch((err) => console.error('Error al cargar recientes:', err));
  };

  // 2. Buscar encuesta específica por RUT
  const handleBuscar = (e) => {
    e.preventDefault();
    if (!rutBusqueda.trim()) return;

    setCargando(true);
    setErrorBusqueda('');
    setEncuestaBuscada(null);

    fetch(`http://localhost:5000/api/encuestas/rut/${rutBusqueda.trim()}`)
      .then((res) => {
        if (!res.ok) throw new Error('No se encontró ninguna encuesta con este RUT');
        return res.json();
      })
      .then((data) => {
        setEncuestaBuscada(data);
        setCargando(false);
      })
      .catch((err) => {
        setErrorBusqueda(err.message);
        setCargando(false);
      });
  };

  // Función auxiliar para color del badge de riesgo
  const getBadgeClass = (riesgo) => {
    switch (riesgo) {
      case 'Vulnerabilidad Crítica': return 'badge-critica';
      case 'Vulnerabilidad Alta': return 'badge-alta';
      case 'Vulnerabilidad Moderada': return 'badge-moderada';
      case 'Vulnerabilidad Baja': return 'badge-baja';
      default: return 'badge-default';
    }
  };

  return (
    <div className="busqueda-container">
      <Navbar />

      <main className="busqueda-main">
        <div className="busqueda-header">
          <h1>Búsqueda de Encuestas por RUT</h1>
          <p>Consulta el historial social de un vecino o revisa los ingresos más recientes</p>
        </div>

        {/* BUSCADOR ORIGINAL */}
        <form onSubmit={handleBuscar} className="busqueda-form">
          <input
            type="text"
            placeholder="Ingrese RUT del Vecino (ej: 12345678-9)"
            value={rutBusqueda}
            onChange={(e) => setRutBusqueda(e.target.value)}
            className="busqueda-input"
          />
          <button type="submit" className="busqueda-btn">
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* MENSAJE DE ERROR */}
        {errorBusqueda && <div className="busqueda-error">{errorBusqueda}</div>}

        {/* RESULTADO DE LA BÚSQUEDA INDIVIDUAL */}
        {encuestaBuscada && (
          <div className="resultado-card">
            <h3>📌 Encuesta Encontrada</h3>
            <p><strong>Nombre:</strong> {encuestaBuscada.nombre}</p>
            <p><strong>RUT:</strong> {encuestaBuscada.rut}</p>
            <p><strong>Dirección:</strong> {encuestaBuscada.direccion}</p>
            <p>
              <strong>Nivel de Riesgo IVPM:</strong>{' '}
              <span className={`badge ${getBadgeClass(encuestaBuscada.nivel_riesgo)}`}>
                {encuestaBuscada.nivel_riesgo || 'Sin evaluar'}
              </span>
            </p>
            <p><strong>Fecha Registro:</strong> {new Date(encuestaBuscada.fecha_registro).toLocaleString()}</p>
          </div>
        )}

        {/* NUEVA TABLA DE LAS 10 ENCUESTAS MÁS RECIENTES */}
        <div className="recientes-section">
          <h2>📋 Últimas 10 Encuestas Ingresadas</h2>
          <div className="tabla-responsive">
            <table className="tabla-recientes">
              <thead>
                <tr>
                  <th>RUT</th>
                  <th>Nombre Vecino</th>
                  <th>Dirección</th>
                  <th>Riesgo IVPM</th>
                  <th>Fecha de Ingreso</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recientes.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No hay registros recientes disponibles.
                    </td>
                  </tr>
                ) : (
                  recientes.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.rut}</strong></td>
                      <td>{item.nombre}</td>
                      <td>{item.direccion}</td>
                      <td>
                        <span className={`badge ${getBadgeClass(item.nivel_riesgo)}`}>
                          {item.nivel_riesgo || 'Sin evaluar'}
                        </span>
                      </td>
                      <td>
                        {item.fecha_registro 
                          ? new Date(item.fecha_registro).toLocaleDateString('es-CL') + ' ' + new Date(item.fecha_registro).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td>
                        <button 
                          className="btn-ver-detalle"
                          onClick={() => {
                            setRutBusqueda(item.rut);
                            setEncuestaBuscada(item);
                          }}
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}