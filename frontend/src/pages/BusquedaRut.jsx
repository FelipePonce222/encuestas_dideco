import React, { useState } from 'react';
import { FaSearch, FaUser, FaPhone, FaMapMarkerAlt, FaFileAlt, FaEdit } from 'react-icons/fa';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './BusquedaRut.css';

export default function BusquedaRut() {
  const [rut, setRut] = useState('');
  const [resultado, setResultado] = useState(null);
  const [buscado, setBuscado] = useState(false);

  // Datos ficticios de prueba mientras conectamos con Flask/SQLite
  const datosMock = [
    {
      rut: '12.345.678-K',
      nombre: 'María Isabel González',
      edad: 74,
      franja: 'Franja 2',
      direccion: 'Av. Las Industrias #1234',
      telefono: '+56 9 8765 4321',
      riesgo: 'alto',
      ultimaEncuesta: '15/10/2026'
    },
    {
      rut: '9.876.543-2',
      nombre: 'Pedro Antonio Morales',
      edad: 68,
      franja: 'Franja 4',
      direccion: 'Pasaje El Salto #567',
      telefono: '+56 9 1234 5678',
      riesgo: 'bajo',
      ultimaEncuesta: '02/09/2026'
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    setBuscado(true);
    
    // Simular búsqueda local
    const enontrado = datosMock.find(
      (item) => item.rut.replace(/[^0-9kK]/g, '') === rut.replace(/[^0-9kK]/g, '')
    );
    
    setResultado(enontrado || null);
  };

  return (
    <div className="busqueda-container">
      <Navbar usuario="José" />

      <main className="busqueda-content">
        <div className="busqueda-card">
          <h2 className="busqueda-title">Búsqueda por RUT</h2>
          <p className="busqueda-subtitle">Consulta directa del historial y ficha del Adulto Mayor</p>

          <form onSubmit={handleSearch} className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Ej: 12.345.678-K"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              required
            />
            <button type="submit" className="btn-search">
              <FaSearch /> Buscar
            </button>
          </form>
        </div>

        {/* Muestra de Resultados */}
        {buscado && (
          <div>
            {resultado ? (
              <div className="result-card">
                <div className="result-header">
                  <div>
                    <h3 className="result-name">{resultado.nombre}</h3>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>RUT: {resultado.rut}</span>
                  </div>
                  <span className={`badge-riesgo ${resultado.riesgo}`}>
                    Riesgo {resultado.riesgo}
                  </span>
                </div>

                <div className="result-grid">
                  <div className="result-item">
                    <span className="result-label">Edad</span>
                    <span className="result-value">{resultado.edad} años</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Sector / Franja</span>
                    <span className="result-value">{resultado.franja}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label"><FaPhone /> Teléfono</span>
                    <span className="result-value">{resultado.telefono}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label"><FaMapMarkerAlt /> Dirección</span>
                    <span className="result-value">{resultado.direccion}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Última Encuesta</span>
                    <span className="result-value">{resultado.ultimaEncuesta}</span>
                  </div>
                </div>

                <div className="result-actions">
                  <button className="btn-action">
                    <FaFileAlt /> Ver Encuesta Completa
                  </button>
                  <button className="btn-action">
                    <FaEdit /> Actualizar Datos
                  </button>
                </div>
              </div>
            ) : (
              <div className="busqueda-card no-result">
                <p>No se encontraron registros asociados al RUT <strong>"{rut}"</strong>.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Asegúrate de ingresar el RUT con o sin puntos y guión.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}