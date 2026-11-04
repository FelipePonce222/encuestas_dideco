import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './Dashboard.css';
import heroBg from '../assets/hero-bg.png';

export default function Dashboard() {
  const navigate = useNavigate();

  // 1. Declaramos las variables de estado que faltaban
  const [stats, setStats] = useState({
    total_encuestas: 0,
    casos_criticos_altos: 0,
    niveles_riesgo: {}
  });
  const [cargando, setCargando] = useState(true);

  // 2. Traemos las métricas desde la API en Flask
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

  return (
    <div className="dashboard-container">
      <Navbar/>

      {/* HERO ORIGINAL CON TU IMAGEN DE FONDO */}
      <div 
        className="dashboard-hero" 
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${heroBg})` }}
      >
        <h1 className="dashboard-hero-title">ENCUESTAS PERSONAS MAYORES</h1>
      </div>

      {/* TU BARRA DE ACCIÓN ORIGINAL */}
      <div className="dashboard-action-bar">
        <button 
          className="dashboard-action-btn" 
          onClick={() => navigate('/nueva-encuesta')}
        >
          Nueva Encuesta
        </button>
        
        <button 
          className="dashboard-action-btn" 
          onClick={() => navigate('/busqueda-rut')}
        >
          Búsqueda por Rut
        </button>
        
        <button 
          className="dashboard-action-btn" 
          onClick={() => navigate('/busqueda-franja')}
        >
          Búsqueda por Franja
        </button>
        
        <button 
          className="dashboard-action-btn" 
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

      {/* CONTENIDO CENTRAL: AHORA CON TARJETAS BI EN TIEMPO REAL */}
      <main className="dashboard-main" style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
        <h3 style={{ color: '#2d3748', textAlign: 'center', marginBottom: '20px', fontSize: '1.4rem' }}>
          📊 Panel de Control y Cobertura IVPM
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '20px',
          marginTop: '10px'
        }}>
          {/* Card Total Encuestas */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #319795', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#718096', fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL REGISTROS</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.total_encuestas || 0)}
            </h2>
          </div>

          {/* Card Riesgo Crítico / Alto */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #e53e3e', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#e53e3e', fontWeight: 'bold', letterSpacing: '0.5px' }}>PRIORIDAD ALTA / CRÍTICA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#e53e3e' }}>
              {cargando ? '...' : (stats?.casos_criticos_altos || 0)}
            </h2>
          </div>

          {/* Card Vulnerabilidad Moderada */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #d69e2e', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#d69e2e', fontWeight: 'bold', letterSpacing: '0.5px' }}>VULNERABILIDAD MODERADA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.niveles_riesgo?.['Vulnerabilidad Moderada'] || 0)}
            </h2>
          </div>

          {/* Card Vulnerabilidad Baja */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', borderLeft: '5px solid #38a169', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#38a169', fontWeight: 'bold', letterSpacing: '0.5px' }}>VULNERABILIDAD BAJA</span>
            <h2 style={{ fontSize: '30px', margin: '8px 0 0 0', color: '#2d3748' }}>
              {cargando ? '...' : (stats?.niveles_riesgo?.['Vulnerabilidad Baja'] || 0)}
            </h2>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}