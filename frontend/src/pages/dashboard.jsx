import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './Dashboard.css';
import heroBg from '../assets/hero-bg.png';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <Navbar usuario="José" />

      <div 
        className="dashboard-hero" 
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${heroBg})` }}
      >
        <h1 className="dashboard-hero-title">ENCUESTAS PERSONAS MAYORES</h1>
      </div>

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

      <main className="dashboard-main">
        <p style={{ textAlign: 'center', color: '#4a5568' }}>
          Selecciona una opción del menú o de la barra principal para comenzar a trabajar.
        </p>
      </main>

      <Footer />
    </div>
  );
}