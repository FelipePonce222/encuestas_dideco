import React, { useState } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './GenerarInforme.css';
import { useNavigate } from 'react-router-dom';

export default function GenerarInforme() {
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  // 📊 Función para descargar la planilla Excel global
  const handleDescargarExcel = async () => {
    setDescargando(true);
    setMensaje('');

    try {
      const response = await fetch('http://localhost:5000/api/reports/excel');
      
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

      setMensaje('✅ ¡Reporte en Excel descargado exitosamente!');
    } catch (err) {
      setMensaje('❌ Ocurrió un error al descargar el Excel.');
      console.error(err);
    } finally {
      setDescargando(false);
    }
  };

  // 📄 Función para imprimir o guardar resumen en PDF
  const handleImprimirResumenPDF = () => {
    window.print();
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
        <button 
          className="dashboard-action-btn" 
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

      <main className="informe-main">
        <div className="informe-header">
          <h1>Centro de Informes y Exportación DIDECO</h1>
          <p>Descarga bases de datos actualizadas o genera reportes institucionales</p>
        </div>

        {mensaje && (
          <div className={`informe-alert ${mensaje.includes('✅') ? 'exito' : 'error'}`}>
            {mensaje}
          </div>
        )}

        <div className="informe-grid">
          
          {/* Opción 1: Exportar a Excel */}
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
              disabled={descargando}
              className="btn-informe btn-excel"
            >
              {descargando ? '⏳ Generando Excel...' : '💾 Descargar Excel (.xlsx)'}
            </button>
          </div>

          {/* Opción 2: Resumen Ejecutivo PDF */}
          <div className="informe-card informe-card-pdf">
            <div>
              <div className="informe-card-icon">📄</div>
              <h3>Informe Imprimible / PDF</h3>
              <p>
                Prepara la vista del sistema en un formato de impresión limpio, ideal para exportar a PDF o presentar físicamente en reuniones directivas de DIDECO.
              </p>
            </div>

            <button 
              onClick={handleImprimirResumenPDF}
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