import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import './Informes.css';

export default function Informes() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Estado del repositorio de documentos
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Formulario de subida
  const [titulo, setTitulo] = useState('');
  const [franja, setFranja] = useState('General');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  // Filtros del listado
  const [filtroFranja, setFiltroFranja] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');

  // Exportación rápida (Opción 2)
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargarDocumentos = async () => {
    setCargandoDocs(true);
    try {
      const res = await apiFetch('http://localhost:5000/api/informes');
      if (res.ok) {
        const data = await res.json();
        setDocumentos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar informes:', err);
    } finally {
      setCargandoDocs(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const obtenerNombreUsuario = () => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('usuario');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.nombre) return parsed.nombre;
      }
    } catch (_) {}
    return 'Funcionario DIDECO';
  };

  const handleSeleccionArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setArchivoSeleccionado(null);
      return;
    }

    const nombreLower = file.name.toLowerCase();
    if (!nombreLower.endsWith('.pdf') && !nombreLower.endsWith('.docx')) {
      setMensaje('❌ Solo se permiten archivos en formato .pdf o .docx.');
      e.target.value = '';
      setArchivoSeleccionado(null);
      return;
    }

    setArchivoSeleccionado(file);
    if (!titulo.trim()) {
      const sinExt = file.name.replace(/\.(pdf|docx)$/i, '');
      setTitulo(sinExt);
    }
  };

  const handleSubirInforme = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      setMensaje('❌ Selecciona un archivo .pdf o .docx antes de subir.');
      return;
    }

    setSubiendo(true);
    setMensaje('');

    try {
      const formData = new FormData();
      formData.append('file', archivoSeleccionado);
      formData.append('titulo', titulo.trim() || archivoSeleccionado.name);
      formData.append('franja', franja);
      formData.append('descripcion', descripcion.trim());
      formData.append('subido_por', obtenerNombreUsuario());

      const res = await apiFetch('http://localhost:5000/api/informes', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo subir el informe.');
      }

      setMensaje('✅ Informe almacenado exitosamente.');
      setTitulo('');
      setDescripcion('');
      setFranja('General');
      setArchivoSeleccionado(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      cargarDocumentos();
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  const handleDescargarDocumento = async (doc) => {
    try {
      const res = await apiFetch(`http://localhost:5000/api/informes/${doc.id}/descargar`);
      if (!res.ok) throw new Error('No se pudo descargar el documento.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nombre_archivo_original;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    }
  };

  const handleEliminarDocumento = async (doc) => {
    if (!window.confirm(`¿Eliminar el informe "${doc.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await apiFetch(`http://localhost:5000/api/informes/${doc.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('No se pudo eliminar el informe.');

      setMensaje('✅ Informe eliminado correctamente.');
      setDocumentos((prev) => prev.filter((item) => item.id !== doc.id));
    } catch (err) {
      setMensaje(`❌ ${err.message}`);
    }
  };

  const formatearTamano = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (filtroFranja !== 'TODAS' && (doc.franja || 'General') !== filtroFranja) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = `${doc.titulo || ''} ${doc.descripcion || ''} ${doc.nombre_archivo_original || ''} ${doc.subido_por || ''}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [documentos, filtroFranja, busqueda]);

  // 📊 Función para descargar la planilla Excel global
  const handleDescargarExcel = async () => {
    setDescargandoExcel(true);
    setMensaje('');

    try {
      const response = await apiFetch('http://localhost:5000/api/reports/excel');
      if (!response.ok) {
        throw new Error('No se pudo generar el reporte en Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Encuestas_DIDECO_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMensaje('✅ ¡Reporte en Excel descargado exitosamente!');
    } catch (err) {
      setMensaje('❌ Ocurrió un error al descargar el Excel.');
      console.error(err);
    } finally {
      setDescargandoExcel(false);
    }
  };

  return (
    <div className="informe-container">
      <Navbar />

      <div className="dashboard-action-bar">
        <button className="dashboard-action-btn" onClick={() => navigate('/nueva-encuesta')}>
          Nueva Encuesta
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/busqueda-rut')}>
          Búsqueda por Rut
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/informes')}>
          Informes
        </button>
        <button
          className="dashboard-action-btn"
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

      <main className="informe-main">
        <div className="informe-top-bar">
          <button
            type="button"
            className="informe-btn-volver"
            onClick={() => navigate('/dashboard')}
          >
            ⬅ Volver al Panel
          </button>
        </div>

        <div className="informe-header">
          <h1>Gestión y Repositorio de Informes DIDECO</h1>
          <p>Almacena, organiza y descarga informes institucionales (.pdf / .docx) o exporta matrices de datos</p>
        </div>

        {mensaje && (
          <div className={`informe-alert ${mensaje.includes('✅') ? 'exito' : 'error'}`}>
            {mensaje}
          </div>
        )}

        {/* SECCIÓN 1: SUBIR NUEVO INFORME (.PDF / .DOCX) */}
        <section className="informe-repo-card">
          <div className="informe-repo-header">
            <h3>📤 Subir Nuevo Informe (.pdf o .docx)</h3>
            <span className="informe-repo-badge">{documentos.length} documento(s) guardado(s)</span>
          </div>

          <form onSubmit={handleSubirInforme} className="informe-upload-form">
            <div className="informe-form-row">
              <div className="informe-field">
                <label>Título del Informe *</label>
                <input
                  type="text"
                  placeholder="Ej: Informe Territorial Franja 1 - Diagnóstico PM"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="informe-field">
                <label>Territorio / Franja</label>
                <select value={franja} onChange={(e) => setFranja(e.target.value)}>
                  <option value="General">General / Comunal</option>
                  <option value="Franja 1">Franja 1</option>
                  <option value="Franja 2">Franja 2</option>
                  <option value="Franja 3">Franja 3</option>
                  <option value="Franja 4">Franja 4</option>
                </select>
              </div>
            </div>

            <div className="informe-form-row">
              <div className="informe-field">
                <label>Observación o Descripción (Opcional)</label>
                <input
                  type="text"
                  placeholder="Breve resumen del contenido del informe..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="informe-field">
                <label>Archivo (.pdf o .docx) *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleSeleccionArchivo}
                  className="informe-file-input"
                  required
                />
              </div>
            </div>

            <div className="informe-form-actions">
              <button type="submit" disabled={subiendo} className="btn-subir-informe">
                {subiendo ? '⏳ Subiendo documento...' : '💾 Guardar Informe en Repositorio'}
              </button>
            </div>
          </form>
        </section>

        {/* SECCIÓN 2: LISTADO DE INFORMES ALMACENADOS */}
        <section className="informe-repo-card">
          <div className="informe-list-header">
            <h3>📁 Informes Almacenados</h3>

            <div className="informe-filtros">
              <input
                type="text"
                placeholder="Buscar por título o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="informe-search-input"
              />

              <select
                value={filtroFranja}
                onChange={(e) => setFiltroFranja(e.target.value)}
                className="informe-select-filtro"
              >
                <option value="TODAS">Todas las Franjas</option>
                <option value="General">General / Comunal</option>
                <option value="Franja 1">Franja 1</option>
                <option value="Franja 2">Franja 2</option>
                <option value="Franja 3">Franja 3</option>
                <option value="Franja 4">Franja 4</option>
              </select>
            </div>
          </div>

          {cargandoDocs ? (
            <p className="informe-empty-msg">Cargando documentos...</p>
          ) : documentosFiltrados.length === 0 ? (
            <p className="informe-empty-msg">
              Aún no hay informes registrados con los filtros seleccionados.
            </p>
          ) : (
            <div className="informe-tabla-wrapper">
              <table className="informe-tabla">
                <thead>
                  <tr>
                    <th>Formato</th>
                    <th>Título y Descripción</th>
                    <th>Franja</th>
                    <th>Tamaño</th>
                    <th>Subido por</th>
                    <th>Fecha</th>
                    <th className="th-centro">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <span className={`badge-formato badge-${doc.extension}`}>
                          {(doc.extension || '').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="doc-titulo">{doc.titulo}</div>
                        {doc.descripcion && (
                          <div className="doc-descripcion">{doc.descripcion}</div>
                        )}
                        <div className="doc-archivo-nombre">{doc.nombre_archivo_original}</div>
                      </td>
                      <td>{doc.franja || 'General'}</td>
                      <td>{formatearTamano(doc.tamano_bytes)}</td>
                      <td>{doc.subido_por || '—'}</td>
                      <td>{doc.fecha_subida ? doc.fecha_subida.slice(0, 10) : '—'}</td>
                      <td className="td-acciones">
                        <button
                          type="button"
                          onClick={() => handleDescargarDocumento(doc)}
                          className="btn-doc-accion btn-doc-descargar"
                          title="Descargar archivo"
                        >
                          ⬇ Descargar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarDocumento(doc)}
                          className="btn-doc-accion btn-doc-eliminar"
                          title="Eliminar informe"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECCIÓN 3: HERRAMIENTAS DE EXPORTACIÓN RÁPIDA */}
        <h3 className="informe-subtitulo-seccion">Herramientas de Exportación Rápida</h3>
        <div className="informe-grid">
          <div className="informe-card informe-card-excel">
            <div>
              <div className="informe-card-icon">📊</div>
              <h3>Exportar Matriz General (Excel)</h3>
              <p>
                Genera una planilla <code>.xlsx</code> completa con la totalidad de los datos capturados en terreno (RUT, Nivel IVPM, Antecedentes de Salud, Redes de Apoyo y Estado de Visita).
              </p>
            </div>

            <button
              onClick={handleDescargarExcel}
              disabled={descargandoExcel}
              className="btn-informe btn-excel"
            >
              {descargandoExcel ? '⏳ Generando Excel...' : '💾 Descargar Excel (.xlsx)'}
            </button>
          </div>

          <div className="informe-card informe-card-pdf">
            <div>
              <div className="informe-card-icon">📄</div>
              <h3>Vista Imprimible / PDF</h3>
              <p>
                Prepara la vista actual del sistema en un formato de impresión limpio, ideal para guardar como PDF o presentar físicamente en reuniones de DIDECO.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="btn-informe btn-pdf"
            >
              🖨️ Imprimir / Guardar como PDF
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}