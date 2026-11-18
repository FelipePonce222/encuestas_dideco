import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import { descargarFichaPdf } from '../utils/GenerarFichaPDF';
import './PrioridadAlta.css';

const CONFIG_CATEGORIAS = {
  prioritarios: {
    titulo: '🚨 Casos de Prioridad Alta y Crítica (IVPM)',
    subtitulo: 'Listado de personas mayores que requieren seguimiento social o derivación prioritaria.',
    tema: 'tema-prioritarios'
  },
  moderada: {
    titulo: '⚠️ Casos de Vulnerabilidad Moderada (IVPM)',
    subtitulo: 'Listado de personas mayores en seguimiento preventivo y monitoreo periódico.',
    tema: 'tema-moderada'
  },
  baja: {
    titulo: '✅ Casos de Vulnerabilidad Baja (IVPM)',
    subtitulo: 'Listado de personas mayores con autonomía estable y menor riesgo social.',
    tema: 'tema-baja'
  }
};

export default function PrioridadAlta({ categoria = 'prioritarios' }) {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [filtroTerritorio, setFiltroTerritorio] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Estado del modal de Ficha Completa
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  const config = CONFIG_CATEGORIAS[categoria] || CONFIG_CATEGORIAS.prioritarios;
  const esVistaPrioritarios = categoria === 'prioritarios';

  useEffect(() => {
    setCargando(true);
    setError('');
    setFiltroNivel('TODOS');
    setFiltroTerritorio('TODOS');
    setBusqueda('');
    setFichaSeleccionada(null);

    apiFetch(`http://localhost:5000/api/vecinos/riesgo/${categoria}`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el listado de vecinos.');
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
  }, [categoria]);

  const territoriosDisponibles = useMemo(() => {
    const setTerr = new Set(
      vecinos.map((v) => (v.unidad_vecinal || '').trim()).filter(Boolean)
    );
    return Array.from(setTerr).sort();
  }, [vecinos]);

  const vecinosFiltrados = useMemo(() => {
    return vecinos.filter((v) => {
      if (esVistaPrioritarios && filtroNivel !== 'TODOS' && v.nivel_riesgo !== filtroNivel) {
        return false;
      }
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
  }, [vecinos, esVistaPrioritarios, filtroNivel, filtroTerritorio, busqueda]);

  const totalCriticos = vecinos.filter((v) => v.nivel_riesgo === 'Vulnerabilidad Crítica').length;
  const totalAltos = vecinos.filter((v) => v.nivel_riesgo === 'Vulnerabilidad Alta').length;

  const promedioIvpm = useMemo(() => {
    const validos = vecinos.filter((v) => typeof v.ivpm_score === 'number');
    if (validos.length === 0) return 'N/A';
    const suma = validos.reduce((acc, v) => acc + v.ivpm_score, 0);
    return `${(suma / validos.length).toFixed(1)} pts`;
  }, [vecinos]);

  const obtenerBadgeInfo = (nivel) => {
    switch (nivel) {
      case 'Vulnerabilidad Crítica':
        return { texto: 'Crítica', clase: 'badge-critica' };
      case 'Vulnerabilidad Alta':
        return { texto: 'Alta', clase: 'badge-alta' };
      case 'Vulnerabilidad Moderada':
        return { texto: 'Moderada', clase: 'badge-moderada' };
      case 'Vulnerabilidad Baja':
        return { texto: 'Baja', clase: 'badge-baja' };
      default:
        return { texto: nivel || 'Sin evaluar', clase: 'badge-neutro' };
    }
  };

  const abrirFichaCompleta = async (vecinoFila) => {
    setCargandoFicha(true);
    setFichaSeleccionada({ ...vecinoFila, encuesta_detalle: {} });

    try {
      const res = await apiFetch(`http://localhost:5000/api/vecino/id/${vecinoFila.id}`);
      if (res.ok) {
        const data = await res.json();
        setFichaSeleccionada(data);
      }
    } catch (err) {
      console.error('Error al cargar detalle de ficha:', err);
    } finally {
      setCargandoFicha(false);
    }
  };

  const detalle = fichaSeleccionada?.encuesta_detalle || {};
  const badgeModal = fichaSeleccionada ? obtenerBadgeInfo(fichaSeleccionada.nivel_riesgo) : null;

  return (
    <div className={`prioridad-container ${config.tema}`}>
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
            <h2>{config.titulo}</h2>
            <p>{config.subtitulo}</p>
          </div>

          {/* Tarjetas Resumen Rápido */}
          {esVistaPrioritarios ? (
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
          ) : (
            <div className="prioridad-kpi-grid">
              <div className={`prioridad-kpi-item ${categoria === 'moderada' ? 'kpi-moderada' : 'kpi-baja'}`}>
                <span className="kpi-label">
                  {categoria === 'moderada' ? 'TOTAL VULNERABILIDAD MODERADA' : 'TOTAL VULNERABILIDAD BAJA'}
                </span>
                <h3 className="kpi-number">{vecinos.length}</h3>
              </div>

              <div className="prioridad-kpi-item kpi-todos">
                <span className="kpi-label">PUNTAJE IVPM PROMEDIO</span>
                <h3 className="kpi-number">{promedioIvpm}</h3>
              </div>

              <div className="prioridad-kpi-item kpi-todos">
                <span className="kpi-label">TERRITORIOS / UV PRESENTES</span>
                <h3 className="kpi-number">{territoriosDisponibles.length}</h3>
              </div>
            </div>
          )}

          {/* Barra de Filtros */}
          <div className="prioridad-filtros-grid">
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="prioridad-input"
            />

            {esVistaPrioritarios && (
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value)}
                className="prioridad-select"
              >
                <option value="TODOS">Todos los niveles prioritarios</option>
                <option value="Vulnerabilidad Crítica">Solo Vulnerabilidad Crítica</option>
                <option value="Vulnerabilidad Alta">Solo Vulnerabilidad Alta</option>
              </select>
            )}

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

          {/* Tabla */}
          {cargando && <p className="prioridad-estado-msg">Cargando registros...</p>}
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
                        const badge = obtenerBadgeInfo(v.nivel_riesgo);

                        return (
                          <tr key={v.id}>
                            <td>
                              <span className={`prioridad-badge ${badge.clase}`}>
                                {badge.texto}
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
                                onClick={() => abrirFichaCompleta(v)}
                                title="Desplegar ficha completa del vecino"
                                className="prioridad-btn-ficha"
                              >
                                Ver Ficha
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

      {/* MODAL DE FICHA COMPLETA DESPLEGADA POR DEFECTO */}
      {fichaSeleccionada && (
        <div
          className="ficha-modal-overlay"
          onClick={() => setFichaSeleccionada(null)}
        >
          <div
            className="ficha-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón superior derecho cerrar */}
            <div className="ficha-modal-top">
              <button
                type="button"
                className="ficha-modal-close"
                onClick={() => setFichaSeleccionada(null)}
                title="Cerrar ficha"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Cabecera Nombre + Pill Nivel Riesgo */}
            <div className="ficha-resultado-header">
              <h3>{fichaSeleccionada.nombre}</h3>
              <span className={`ficha-badge-nivel ${badgeModal.clase}`}>
                {fichaSeleccionada.nivel_riesgo}
              </span>
            </div>

            {/* Datos principales en 2 columnas */}
            <div className="ficha-resultado-grid">
              <div><strong>RUT:</strong> {fichaSeleccionada.rut}</div>
              <div><strong>Edad:</strong> {fichaSeleccionada.edad ? `${fichaSeleccionada.edad} años` : 'No registrada'}</div>
              <div><strong>Dirección:</strong> {fichaSeleccionada.direccion || 'No registrada'}</div>
              <div><strong>Unidad Vecinal:</strong> {fichaSeleccionada.unidad_vecinal || 'No registrada'}</div>
              <div><strong>Territorio:</strong> {fichaSeleccionada.franja || 'No registrado'}</div>
              <div><strong>Estado Visita:</strong> {fichaSeleccionada.hallazgo || 'No registrado'}</div>
            </div>

            {/* Caja Azul Puntaje Global IVPM */}
            <div className="ficha-ivpm-box">
              <span className="ficha-ivpm-label">Puntaje Global IVPM:</span>
              <span className="ficha-ivpm-value">
                {fichaSeleccionada.ivpm_score !== null
                  ? `${fichaSeleccionada.ivpm_score} / 100 pts`
                  : 'N/A (Sin contacto/No aplica)'}
              </span>
            </div>

            {/* Detalle completo desplegado por defecto */}
            {cargandoFicha ? (
              <p className="prioridad-estado-msg">Cargando antecedentes completos...</p>
            ) : (
              <div className="ficha-detalle-box">
                <h4>🩺 Antecedentes de Salud y Funcionalidad</h4>
                <p>
                  <strong>Centro de Salud:</strong>{' '}
                  {detalle.salud_centro_nombre || 'No registrado'} ({detalle.salud_centro_comuna || 'N/A'})
                </p>
                <p>
                  <strong>Patologías:</strong>{' '}
                  {Array.isArray(detalle.patologias) && detalle.patologias.length > 0
                    ? detalle.patologias.join(', ')
                    : 'Ninguna declarada'}{' '}
                  {detalle.patologias_otra ? `(${detalle.patologias_otra})` : ''}
                </p>
                <p>
                  <strong>Tratamiento:</strong> {detalle.patologias_tratamiento || 'No informa'}
                </p>
                <p>
                  <strong>Discapacidad / Credencial:</strong>{' '}
                  {detalle.discapacidad_aplica === 'Sí'
                    ? `${detalle.discapacidad_tipo} - Credencial: ${detalle.discapacidad_credencial}`
                    : 'No presenta'}
                </p>
                <p>
                  <strong>Ayuda Técnica:</strong>{' '}
                  {detalle.ayuda_tecnica_aplica || 'No informa'}{' '}
                  {detalle.ayuda_tecnica_detalle ? `(${detalle.ayuda_tecnica_detalle})` : ''}
                </p>

                <h4>🏠 Vivienda y Entorno Habitacional</h4>
                <p><strong>Situación Habitacional:</strong> {detalle.situacion_habitacional || 'No informa'}</p>
                <p><strong>Material Predominante:</strong> {detalle.material_predominante || 'No informa'}</p>
                <p><strong>Estado General Vivienda:</strong> {detalle.estado_vivienda || 'No informa'}</p>
                <p><strong>Revisión Eléctrica:</strong> {detalle.revision_electrica || 'No informa'}</p>
                <p><strong>Alimentación (veces al día):</strong> {detalle.alimentacion_frecuencia || 'No informa'}</p>

                <h4>🤝 Redes de Apoyo y Cuidados</h4>
                <p><strong>Convivientes en hogar:</strong> {detalle.convivientes_cantidad || '1'} persona(s)</p>
                <p><strong>Frecuencia de Visitas:</strong> {detalle.frecuencia_visitas || 'No informa'}</p>
                <p>
                  <strong>¿Recibe cuidados?:</strong>{' '}
                  {detalle.recibe_cuidados || 'No informa'}{' '}
                  {Array.isArray(detalle.recibe_cuidados_quien) && detalle.recibe_cuidados_quien.length > 0
                    ? `(${detalle.recibe_cuidados_quien.join(', ')})`
                    : ''}
                </p>
                <p>
                  <strong>Organizaciones / Programas:</strong>{' '}
                  {detalle.programa_social === 'Sí' ? detalle.programa_social_detalle : 'Ninguno'}
                </p>

                <h4>📝 Observaciones de Campo</h4>
                <div className="ficha-observaciones-box">
                  "{detalle.observaciones || fichaSeleccionada.observaciones || 'Sin observaciones registradas.'}"
                </div>
              </div>
            )}

            {/* Botón inferior: Descargar en PDF */}
            <div className="ficha-modal-actions">
              <button
                type="button"
                className="ficha-btn-pdf"
                onClick={() => descargarFichaPdf(fichaSeleccionada)}
              >
                📄 Descargar en PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}