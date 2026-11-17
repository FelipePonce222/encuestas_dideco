import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import './PrioridadAlta.css';

export default function PrioridadAlta() {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [filtroTerritorio, setFiltroTerritorio] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    apiFetch('http://localhost:5000/api/vecinos/prioritarios')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el listado de casos prioritarios.');
        return res.json();
      })
      .then((data) => {
        setVecinos(Array.isArray(data) ? data : []);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, []);

  // Lista única de Unidades Vecinales / Villas disponibles para filtrar
  const territoriosDisponibles = useMemo(() => {
    const setTerr = new Set(
      vecinos.map((v) => (v.unidad_vecinal || '').trim()).filter(Boolean)
    );
    return Array.from(setTerr).sort();
  }, [vecinos]);

  // Aplicación de filtros
  const vecinosFiltrados = useMemo(() => {
    return vecinos.filter((v) => {
      if (filtroNivel !== 'TODOS' && v.nivel_riesgo !== filtroNivel) return false;
      if (filtroTerritorio !== 'TODOS' && (v.unidad_vecinal || '').trim() !== filtroTerritorio) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = `${v.nombre || ''} ${v.rut || ''} ${v.direccion || ''}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [vecinos, filtroNivel, filtroTerritorio, busqueda]);

  const totalCriticos = vecinos.filter((v) => v.nivel_riesgo === 'Vulnerabilidad Crítica').length;
  const totalAltos = vecinos.filter((v) => v.nivel_riesgo === 'Vulnerabilidad Alta').length;

  const verFichaVecino = (rut) => {
    if (!rut || rut === 'SIN RUT') return;
    navigate('/busqueda-rut', { state: { rut } });
  };

  return (
    <div className="prioridad-container">
      <Navbar />

      <div className="dashboard-action-bar">
        <button className="dashboard-action-btn" onClick={() => navigate('/nueva-encuesta')}>
          Nueva Encuesta
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/busqueda-rut')}>
          Búsqueda por Rut
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/generar-informe')}>
          Generar Informe
        </button>
        <button
          className="dashboard-action-btn"
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

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
            <h2>🚨 Casos de Prioridad Alta y Crítica (IVPM)</h2>
            <p>
              Listado de personas mayores que requieren seguimiento social o derivación prioritaria.
            </p>
          </div>

          {/* Tarjetas Resumen Rápido */}
          <div className="prioridad-kpi-grid">
            <div
              onClick={() => setFiltroNivel('TODOS')}
              className={`prioridad-kpi-item kpi-todos ${filtroNivel === 'TODOS' ? 'active' : ''}`}
            >
              <span className="kpi-label">TOTAL PRIORITARIOS</span>
              <h3 className="kpi-number">{vecinos.length}</h3>
            </div>

            <div
              onClick={() => setFiltroNivel('Vulnerabilidad Crítica')}
              className={`prioridad-kpi-item kpi-critica ${filtroNivel === 'Vulnerabilidad Crítica' ? 'active' : ''}`}
            >
              <span className="kpi-label">VULNERABILIDAD CRÍTICA</span>
              <h3 className="kpi-number">{totalCriticos}</h3>
            </div>

            <div
              onClick={() => setFiltroNivel('Vulnerabilidad Alta')}
              className={`prioridad-kpi-item kpi-alta ${filtroNivel === 'Vulnerabilidad Alta' ? 'active' : ''}`}
            >
              <span className="kpi-label">VULNERABILIDAD ALTA</span>
              <h3 className="kpi-number">{totalAltos}</h3>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="prioridad-filtros-grid">
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="prioridad-input"
            />

            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="prioridad-select"
            >
              <option value="TODOS">Todos los niveles prioritarios</option>
              <option value="Vulnerabilidad Crítica">Solo Vulnerabilidad Crítica</option>
              <option value="Vulnerabilidad Alta">Solo Vulnerabilidad Alta</option>
            </select>

            <select
              value={filtroTerritorio}
              onChange={(e) => setFiltroTerritorio(e.target.value)}
              className="prioridad-select"
            >
              <option value="TODOS">Todas las Unidades Vecinales / Villas</option>
              {territoriosDisponibles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Contenido / Tabla */}
          {cargando && <p className="prioridad-estado-msg">Cargando casos prioritarios...</p>}
          {error && <div className="prioridad-error">{error}</div>}

          {!cargando && !error && (
            <>
              <p className="prioridad-conteo">
                Mostrando <strong>{vecinosFiltrados.length}</strong> de {vecinos.length} registros.
              </p>

              <div className="prioridad-tabla-wrapper">
                <table className="prioridad-tabla">
                  <thead>
                    <tr>
                      <th>Nivel Riesgo</th>
                      <th>IVPM</th>
                      <th>Nombre Completo</th>
                      <th>RUT</th>
                      <th>Edad</th>
                      <th>Dirección</th>
                      <th>UV / Villa</th>
                      <th className="th-centro">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vecinosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="prioridad-sin-resultados">
                          No se encontraron registros con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      vecinosFiltrados.map((v) => {
                        const esCritica = v.nivel_riesgo === 'Vulnerabilidad Crítica';
                        const tieneRutValido = v.rut && v.rut !== 'SIN RUT';

                        return (
                          <tr key={v.id}>
                            <td>
                              <span className={`prioridad-badge ${esCritica ? 'badge-critica' : 'badge-alta'}`}>
                                {esCritica ? 'Crítica' : 'Alta'}
                              </span>
                            </td>
                            <td className="td-ivpm">
                              {v.ivpm_score !== null ? `${v.ivpm_score} pts` : 'N/A'}
                            </td>
                            <td className="td-nombre">{v.nombre}</td>
                            <td className="td-rut">{v.rut}</td>
                            <td>{v.edad ? `${v.edad} años` : '—'}</td>
                            <td>{v.direccion || '—'}</td>
                            <td>{v.unidad_vecinal || '—'}</td>
                            <td className="td-accion">
                              <button
                                type="button"
                                disabled={!tieneRutValido}
                                onClick={() => verFichaVecino(v.rut)}
                                title={tieneRutValido ? 'Abrir ficha completa' : 'Encuesta registrada sin RUT'}
                                className={`prioridad-btn-ficha ${tieneRutValido ? '' : 'disabled'}`}
                              >
                                {tieneRutValido ? 'Ver Ficha' : 'Sin RUT'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}