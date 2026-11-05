import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './Dashboard.css';
import heroBg from '../assets/hero-bg.png';

// Imports de Chart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registro de componentes de gráficos
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_encuestas: 0,
    casos_criticos_altos: 0,
    niveles_riesgo: {},
    hallazgos: {}
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Error en la respuesta del servidor');
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error('Error al cargar métricas:', err);
        setCargando(false);
      });
  }, []);

  // Configuraciones para el Gráfico de Torta (Nivel de Riesgo IVPM)
  const datosRiesgo = {
    labels: ['Crítica', 'Alta', 'Moderada', 'Baja', 'Sin evaluar'],
    datasets: [
      {
        label: 'Vecinos',
        data: [
          stats?.niveles_riesgo?.['Vulnerabilidad Crítica'] || 0,
          stats?.niveles_riesgo?.['Vulnerabilidad Alta'] || 0,
          stats?.niveles_riesgo?.['Vulnerabilidad Moderada'] || 0,
          stats?.niveles_riesgo?.['Vulnerabilidad Baja'] || 0,
          stats?.niveles_riesgo?.['Sin evaluar'] || 0
        ],
        backgroundColor: ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#a0aec0'],
        borderWidth: 1
      }
    ]
  };

  // Configuraciones para el Gráfico de Barras (Estado de Visitas)
  const labelsHallazgos = Object.keys(stats?.hallazgos || {});
  const valoresHallazgos = Object.values(stats?.hallazgos || {});

  const datosHallazgos = {
    labels: labelsHallazgos.length > 0 ? labelsHallazgos : ['Sin datos'],
    datasets: [
      {
        label: 'Visitas',
        data: valoresHallazgos.length > 0 ? valoresHallazgos : [0],
        backgroundColor: '#319795'
      }
    ]
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      {/* HERO ORIGINAL */}
      <div 
        className="dashboard-hero" 
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${heroBg})` }}
      >
        <h1 className="dashboard-hero-title">ENCUESTAS PERSONAS MAYORES</h1>
      </div>

      {/* BARRA DE ACCIÓN ORIGINAL */}
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

      {/* CONTENIDO CENTRAL */}
      <main className="dashboard-main" style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>
        <h3 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '20px', fontSize: '1.4rem' }}>
          Panel de Control y Cobertura IVPM
        </h3>

        {/* TARJETAS KPI ORIGINALES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #319795', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL REGISTROS</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.total_encuestas || 0)}
            </h2>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #e53e3e', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#e53e3e', fontWeight: 'bold', letterSpacing: '0.5px' }}>PRIORIDAD ALTA / CRÍTICA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#e53e3e' }}>
              {cargando ? '...' : ((stats?.niveles_riesgo?.['Vulnerabilidad Crítica'] || 0) + (stats?.niveles_riesgo?.['Vulnerabilidad Alta'] || 0))}
            </h2>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #d69e2e', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#d69e2e', fontWeight: 'bold', letterSpacing: '0.5px' }}>VULNERABILIDAD MODERADA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.niveles_riesgo?.['Vulnerabilidad Moderada'] || 0)}
            </h2>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #38a169', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#38a169', fontWeight: 'bold', letterSpacing: '0.5px' }}>VULNERABILIDAD BAJA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.niveles_riesgo?.['Vulnerabilidad Baja'] || 0)}
            </h2>
          </div>
        </div>

        {/* NUEVA SECCIÓN DE GRÁFICOS VISUALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
          
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <h4 style={{ textAlign: 'center', color: '#2d3748', marginBottom: '15px' }}>Distribución Nivel IVPM</h4>
            <div style={{ width: '75%', margin: '0 auto' }}>
              <Pie data={datosRiesgo} />
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <h4 style={{ textAlign: 'center', color: '#2d3748', marginBottom: '15px' }}>Estado de Visitas Territoriales</h4>
            <Bar data={datosHallazgos} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}