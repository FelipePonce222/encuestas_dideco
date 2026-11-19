import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import './dashboard.css';
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
    apiFetch('http://localhost:5000/api/dashboard/stats')
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

  const totalPrioritarios =
    (stats?.niveles_riesgo?.['Vulnerabilidad Crítica'] || 0) +
    (stats?.niveles_riesgo?.['Vulnerabilidad Alta'] || 0);

  const totalModerada = stats?.niveles_riesgo?.['Vulnerabilidad Moderada'] || 0;
  const totalBaja = stats?.niveles_riesgo?.['Vulnerabilidad Baja'] || 0;

  const viviendasVisitadas = stats?.total_encuestas || 0;
  const encuestasRealizadas = totalPrioritarios + totalModerada + totalBaja;

  return (
    <div className="dashboard-container">
      <Navbar />

      {/* HERO */}
      <div
        className="dashboard-hero"
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${heroBg})` }}
      >
        <h1 className="dashboard-hero-title">ENCUESTAS PERSONAS MAYORES</h1>
      </div>

      {/* BARRA DE ACCIÓN */}
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
        <button className="dashboard-action-btn" onClick={() => navigate('/graficos')}>
          Gráficos
        </button>
        <button
          className="dashboard-action-btn"
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

      {/* CONTENIDO CENTRAL */}
      <main className="dashboard-main">
        <h3 className="dashboard-section-title">Panel de Control y Cobertura IVPM</h3>

        {/* TARJETAS KPI */}
        <div
          className="dashboard-kpi-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))' }}
        >
          <div className="kpi-card kpi-card-total">
            <span className="kpi-card-label">VIVIENDAS VISITADAS</span>
            <h2 className="kpi-card-value">
              {cargando ? '...' : viviendasVisitadas}
            </h2>
            <span className="kpi-card-link" style={{ color: '#718096' }}>
              Total registros en terreno
            </span>
          </div>

          <div
            className="kpi-card kpi-card-total"
            style={{ borderLeftColor: '#2b6cb0' }}
          >
            <span className="kpi-card-label">ENCUESTAS REALIZADAS</span>
            <h2 className="kpi-card-value" style={{ color: '#2b6cb0' }}>
              {cargando ? '...' : encuestasRealizadas}
            </h2>
            <span className="kpi-card-link" style={{ color: '#4a5568' }}>
              Con evaluación IVPM
            </span>
          </div>

          <div
            onClick={() => navigate('/prioridad-alta')}
            title="Haz clic para ver el listado de casos con Prioridad Alta y Crítica"
            className="kpi-card kpi-card-clickable kpi-card-critica"
          >
            <span className="kpi-card-label">PRIORIDAD ALTA / CRÍTICA</span>
            <h2 className="kpi-card-value">
              {cargando ? '...' : totalPrioritarios}
            </h2>
            <span className="kpi-card-link">Ver listado →</span>
          </div>

          <div
            onClick={() => navigate('/vulnerabilidad-moderada')}
            title="Haz clic para ver el listado de casos con Vulnerabilidad Moderada"
            className="kpi-card kpi-card-clickable kpi-card-moderada"
          >
            <span className="kpi-card-label">VULNERABILIDAD MODERADA</span>
            <h2 className="kpi-card-value">
              {cargando ? '...' : totalModerada}
            </h2>
            <span className="kpi-card-link">Ver listado →</span>
          </div>

          <div
            onClick={() => navigate('/vulnerabilidad-baja')}
            title="Haz clic para ver el listado de casos con Vulnerabilidad Baja"
            className="kpi-card kpi-card-clickable kpi-card-baja"
          >
            <span className="kpi-card-label">VULNERABILIDAD BAJA</span>
            <h2 className="kpi-card-value">
              {cargando ? '...' : totalBaja}
            </h2>
            <span className="kpi-card-link">Ver listado →</span>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICOS VISUALES */}
        <div className="dashboard-charts-grid">
          <div className="dashboard-chart-card">
            <h4 className="dashboard-chart-title">Distribución Nivel IVPM</h4>
            <div className="dashboard-pie-wrapper">
              <Pie data={datosRiesgo} />
            </div>
          </div>

          <div className="dashboard-chart-card">
            <h4 className="dashboard-chart-title">Estado de Visitas Territoriales</h4>
            <Bar
              data={datosHallazgos}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}