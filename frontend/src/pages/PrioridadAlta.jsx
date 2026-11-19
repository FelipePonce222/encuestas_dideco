import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import { descargarFichaPdf } from '../utils/GenerarFichaPDF';
import { tienePermiso } from '../utils/permisos';
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

  const puedeEditar = tienePermiso('editar_encuesta');
  const puedeEliminar = tienePermiso('eliminar_encuesta');

  // Filtros
  const [filtroFranja, setFiltroFranja] = useState('TODOS');
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [filtroTerritorio, setFiltroTerritorio] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Estado del modal de Ficha Completa + Edición
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formEdicion, setFormEdicion] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mensajeModal, setMensajeModal] = useState('');

  const config = CONFIG_CATEGORIAS[categoria] || CONFIG_CATEGORIAS.prioritarios;
  const esVistaPrioritarios = categoria === 'prioritarios';

  useEffect(() => {
    setCargando(true);
    setError('');
    setFiltroFranja('TODOS');
    setFiltroNivel('TODOS');
    setFiltroTerritorio('TODOS');
    setBusqueda('');
    setFichaSeleccionada(null);
    setModoEdicion(false);
    setMensajeModal('');

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

  const franjasDisponibles = useMemo(() => {
    const setFranjas = new Set(
      vecinos.map((v) => (v.franja || '').trim()).filter(Boolean)
    );
    return Array.from(setFranjas).sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true })
    );
  }, [vecinos]);

  const vecinosPorFranja = useMemo(() => {
    if (filtroFranja === 'TODOS') return vecinos;
    return vecinos.filter((v) => (v.franja || '').trim() === filtroFranja);
  }, [vecinos, filtroFranja]);

  const territoriosDisponibles = useMemo(() => {
    const setTerr = new Set(
      vecinosPorFranja.map((v) => (v.unidad_vecinal || '').trim()).filter(Boolean)
    );
    return Array.from(setTerr).sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true })
    );
  }, [vecinosPorFranja]);

  const vecinosFiltrados = useMemo(() => {
    return vecinosPorFranja.filter((v) => {
      if (esVistaPrioritarios && filtroNivel !== 'TODOS' && v.nivel_riesgo !== filtroNivel) {
        return false;
      }
      if (filtroTerritorio !== 'TODOS' && (v.unidad_vecinal || '').trim() !== filtroTerritorio) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = `${v.nombre || ''} ${v.rut || ''} ${v.direccion || ''} ${v.franja || ''}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [vecinosPorFranja, esVistaPrioritarios, filtroNivel, filtroTerritorio, busqueda]);

  const totalCriticos = vecinosPorFranja.filter(
    (v) => v.nivel_riesgo === 'Vulnerabilidad Crítica'
  ).length;
  const totalAltos = vecinosPorFranja.filter(
    (v) => v.nivel_riesgo === 'Vulnerabilidad Alta'
  ).length;

  const promedioIvpm = useMemo(() => {
    const validos = vecinosPorFranja.filter((v) => typeof v.ivpm_score === 'number');
    if (validos.length === 0) return 'N/A';
    const suma = validos.reduce((acc, v) => acc + v.ivpm_score, 0);
    return `${(suma / validos.length).toFixed(1)} pts`;
  }, [vecinosPorFranja]);

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
    setModoEdicion(false);
    setMensajeModal('');
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

  const formatearRSH = (ficha, det) => {
    if (ficha?.rsh) return ficha.rsh;

    const aplica = det.rsh_aplica || det.rsh_tiene || det.tiene_rsh;
    const tramo = det.rsh_tramo || det.tramo_rsh || det.rsh_porcentaje || det.porcentaje_rsh;
    if (aplica && tramo) {
      return aplica === 'Sí' ? `${tramo}` : `${aplica} (${tramo})`;
    }

    const directo =
      det.rsh ||
      det.registro_social_hogares ||
      det.registro_social ||
      det.calificacion_socioeconomica ||
      tramo ||
      aplica;
    if (directo) return String(directo);

    const entradasRsh = Object.entries(det || {})
      .filter(([k, v]) => /rsh|registro\s*social/i.test(k) && v !== null && String(v).trim() !== '')
      .map(([, v]) => String(v).trim());

    if (entradasRsh.length > 1) {
      return Array.from(new Set(entradasRsh)).join(' — ');
    }
    if (entradasRsh.length === 1) return entradasRsh[0];

    return 'No registrado';
  };

  const activarModoEdicion = () => {
    const det = fichaSeleccionada?.encuesta_detalle || {};
    setFormEdicion({
      nombre: fichaSeleccionada.nombre || '',
      rut: fichaSeleccionada.rut || '',
      edad: fichaSeleccionada.edad ?? '',
      direccion: fichaSeleccionada.direccion || '',
      unidad_vecinal: fichaSeleccionada.unidad_vecinal || '',
      franja: fichaSeleccionada.franja || 'Franja 1',
      hallazgo: fichaSeleccionada.hallazgo || '',
      tramo_rsh: det.tramo_rsh || det.rsh_tramo || det.rsh || '',
      salud_centro_nombre: det.salud_centro_nombre || '',
      salud_centro_comuna: det.salud_centro_comuna || '',
      patologias_tratamiento: det.patologias_tratamiento || '',
      situacion_habitacional: det.situacion_habitacional || '',
      material_predominante: det.material_predominante || '',
      estado_vivienda: det.estado_vivienda || '',
      revision_electrica: det.revision_electrica || '',
      alimentacion_frecuencia: det.alimentacion_frecuencia || '',
      convivientes_cantidad: det.convivientes_cantidad || '',
      frecuencia_visitas: det.frecuencia_visitas || '',
      recibe_cuidados: det.recibe_cuidados || '',
      programa_social: det.programa_social || '',
      programa_social_detalle: det.programa_social_detalle || '',
      observaciones: det.observaciones || fichaSeleccionada.observaciones || ''
    });
    setMensajeModal('');
    setModoEdicion(true);
  };

  const handleCampoEdicion = (campo, valor) => {
    setFormEdicion((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setGuardandoEdicion(true);
    setMensajeModal('');

    try {
      const res = await apiFetch(`http://localhost:5000/api/vecinos/${fichaSeleccionada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEdicion)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron guardar los cambios.');
      }

      const actualizado = data.vecino;
      setFichaSeleccionada(actualizado);
      setVecinos((prev) =>
        prev.map((item) => (item.id === actualizado.id ? { ...item, ...actualizado } : item))
      );
      setModoEdicion(false);
      setMensajeModal('✅ Cambios guardados y puntaje IVPM actualizado.');
    } catch (err) {
      setMensajeModal(`❌ ${err.message}`);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarEncuesta = async () => {
    if (!window.confirm(`¿Estás seguro/a de eliminar la encuesta de "${fichaSeleccionada.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await apiFetch(`http://localhost:5000/api/vecinos/${fichaSeleccionada.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar la encuesta.');
      }

      setVecinos((prev) => prev.filter((item) => item.id !== fichaSeleccionada.id));
      setFichaSeleccionada(null);
    } catch (err) {
      setMensajeModal(`❌ ${err.message}`);
    }
  };

  const detalle = fichaSeleccionada?.encuesta_detalle || {};
  const badgeModal = fichaSeleccionada ? obtenerBadgeInfo(fichaSeleccionada.nivel_riesgo) : null;

  return (
    <div className={`prioridad-container ${config.tema}`}>
      <Navbar />

      <div className="dashboard-action-bar">
        {tienePermiso('crear_encuesta') && (
          <button className="dashboard-action-btn" onClick={() => navigate('/nueva-encuesta')}>
            Nueva Encuesta
          </button>
        )}
        {tienePermiso('buscar_rut') && (
          <button className="dashboard-action-btn" onClick={() => navigate('/busqueda-rut')}>
            Búsqueda por Rut
          </button>
        )}
        {tienePermiso('informes_ver') && (
          <button className="dashboard-action-btn" onClick={() => navigate('/informes')}>
            Informes
          </button>
        )}
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
                <span className="kpi-label">
                  TOTAL PRIORITARIOS {filtroFranja !== 'TODOS' ? `(${filtroFranja.toUpperCase()})` : ''}
                </span>
                <h3 className="kpi-number">{vecinosPorFranja.length}</h3>
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
                  {filtroFranja !== 'TODOS' ? ` (${filtroFranja.toUpperCase()})` : ''}
                </span>
                <h3 className="kpi-number">{vecinosPorFranja.length}</h3>
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

            <select
              value={filtroFranja}
              onChange={(e) => {
                setFiltroFranja(e.target.value);
                setFiltroTerritorio('TODOS');
              }}
              className="prioridad-select"
            >
              <option value="TODOS">Todas las Franjas</option>
              {franjasDisponibles.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

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
                Mostrando <strong>{vecinosFiltrados.length}</strong> de {vecinosPorFranja.length} registros
                {filtroFranja !== 'TODOS' ? ` en ${filtroFranja}` : ''}.
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
                      <th>Franja</th>
                      <th>UV / Villa</th>
                      <th className="th-centro">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vecinosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="prioridad-sin-resultados">
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
                            <td>{v.franja || '—'}</td>
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

      {/* MODAL DE FICHA COMPLETA + EDICIÓN / ELIMINACIÓN */}
      {fichaSeleccionada && (
        <div
          className="ficha-modal-overlay"
          onClick={() => {
            setFichaSeleccionada(null);
            setModoEdicion(false);
          }}
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
                onClick={() => {
                  setFichaSeleccionada(null);
                  setModoEdicion(false);
                }}
                title="Cerrar ficha"
              >
                ✕ Cerrar
              </button>
            </div>

            {mensajeModal && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  fontWeight: 'bold',
                  fontSize: '13.5px',
                  backgroundColor: mensajeModal.includes('❌') ? '#fed7d7' : '#e6fffa',
                  color: mensajeModal.includes('❌') ? '#9b2c2c' : '#234e52'
                }}
              >
                {mensajeModal}
              </div>
            )}

            {/* Cabecera Nombre + Pill Nivel Riesgo */}
            <div className="ficha-resultado-header">
              <h3>{modoEdicion ? `✏️ Editando: ${fichaSeleccionada.nombre}` : fichaSeleccionada.nombre}</h3>
              <span className={`ficha-badge-nivel ${badgeModal.clase}`}>
                {fichaSeleccionada.nivel_riesgo}
              </span>
            </div>

            {modoEdicion ? (
              /* FORMULARIO DE EDICIÓN DE ENCUESTA */
              <form onSubmit={handleGuardarEdicion} className="ficha-detalle-box">
                <h4>👤 Identificación y Territorio (Corrección de datos)</h4>
                <div className="ficha-resultado-grid">
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Nombre Completo *</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.nombre}
                      onChange={(e) => handleCampoEdicion('nombre', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>RUT</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.rut}
                      onChange={(e) => handleCampoEdicion('rut', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Edad</label>
                    <input
                      type="number"
                      className="prioridad-input"
                      value={formEdicion.edad}
                      onChange={(e) => handleCampoEdicion('edad', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Dirección</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.direccion}
                      onChange={(e) => handleCampoEdicion('direccion', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Unidad Vecinal / Villa</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.unidad_vecinal}
                      onChange={(e) => handleCampoEdicion('unidad_vecinal', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Territorio / Franja</label>
                    <select
                      className="prioridad-select"
                      value={formEdicion.franja}
                      onChange={(e) => handleCampoEdicion('franja', e.target.value)}
                    >
                      <option value="Franja 1">Franja 1</option>
                      <option value="Franja 2">Franja 2</option>
                      <option value="Franja 3">Franja 3</option>
                      <option value="Sin franja">Sin franja</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Tramo RSH</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      placeholder="Ej: 0% al 40%"
                      value={formEdicion.tramo_rsh}
                      onChange={(e) => handleCampoEdicion('tramo_rsh', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Estado Visita / Hallazgo</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.hallazgo}
                      onChange={(e) => handleCampoEdicion('hallazgo', e.target.value)}
                    />
                  </div>
                </div>

                <h4>🩺 Salud y Vivienda</h4>
                <div className="ficha-resultado-grid">
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Centro de Salud</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.salud_centro_nombre}
                      onChange={(e) => handleCampoEdicion('salud_centro_nombre', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Tratamiento Médico</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.patologias_tratamiento}
                      onChange={(e) => handleCampoEdicion('patologias_tratamiento', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Situación Habitacional</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.situacion_habitacional}
                      onChange={(e) => handleCampoEdicion('situacion_habitacional', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Estado General Vivienda</label>
                    <input
                      type="text"
                      className="prioridad-input"
                      value={formEdicion.estado_vivienda}
                      onChange={(e) => handleCampoEdicion('estado_vivienda', e.target.value)}
                    />
                  </div>
                </div>

                <h4>📝 Observaciones de Campo (Redacción y Ortografía)</h4>
                <textarea
                  rows="4"
                  className="prioridad-input"
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  value={formEdicion.observaciones}
                  onChange={(e) => handleCampoEdicion('observaciones', e.target.value)}
                />

                <div className="ficha-modal-actions" style={{ gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={guardandoEdicion}
                    className="ficha-btn-pdf"
                    style={{ backgroundColor: '#2f855a' }}
                  >
                    {guardandoEdicion ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoEdicion(false)}
                    className="ficha-modal-close"
                    style={{ padding: '12px 20px', fontSize: '14px' }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Datos principales en 2 columnas */}
                <div className="ficha-resultado-grid">
                  <div><strong>RUT:</strong> {fichaSeleccionada.rut}</div>
                  <div><strong>Edad:</strong> {fichaSeleccionada.edad ? `${fichaSeleccionada.edad} años` : 'No registrada'}</div>
                  <div><strong>Dirección:</strong> {fichaSeleccionada.direccion || 'No registrada'}</div>
                  <div><strong>Unidad Vecinal:</strong> {fichaSeleccionada.unidad_vecinal || 'No registrada'}</div>
                  <div><strong>Territorio:</strong> {fichaSeleccionada.franja || 'No registrado'}</div>
                  <div>
                    <strong>Registro Social (RSH):</strong>{' '}
                    {cargandoFicha ? 'Cargando...' : formatearRSH(fichaSeleccionada, detalle)}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Estado Visita:</strong> {fichaSeleccionada.hallazgo || 'No registrado'}
                  </div>
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

                {/* Botones inferiores: PDF + Editar (Admin/Coord) + Eliminar (Admin) */}
                <div className="ficha-modal-actions" style={{ gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="ficha-btn-pdf"
                    onClick={() => descargarFichaPdf(fichaSeleccionada)}
                  >
                    📄 Descargar en PDF
                  </button>

                  {puedeEditar && !cargandoFicha && (
                    <button
                      type="button"
                      className="ficha-btn-pdf"
                      style={{ backgroundColor: '#2b6cb0' }}
                      onClick={activarModoEdicion}
                    >
                      ✏️ Editar Encuesta
                    </button>
                  )}

                  {puedeEliminar && !cargandoFicha && (
                    <button
                      type="button"
                      className="ficha-btn-pdf"
                      style={{ backgroundColor: '#742a2a' }}
                      onClick={handleEliminarEncuesta}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}