import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserCircle, 
  FaBars, 
  FaTimes, 
  FaFileAlt, 
  FaSearch, 
  FaMapMarkedAlt, 
  FaBuilding, 
  FaSignOutAlt 
} from 'react-icons/fa';
import logoLaGranja from '../assets/Escudo-y-texto.png';
import './navbar.css';

export default function Navbar({ usuario = "José" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleNavigation = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="navbar-header">
      <div className="navbar-topbar">
        <div 
          className="navbar-logo-container" 
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={logoLaGranja} 
            alt="Escudo Ilustre Municipalidad de La Granja" 
            className="navbar-logo-img" 
          />
        </div>
        
        <div className="navbar-user-section">
          {/* Clic en Hola, usuario lleva directamente a Mi Perfil */}
          <span 
            className="navbar-welcome" 
            onClick={() => navigate('/perfil')}
            style={{ cursor: 'pointer' }}
            title="Ir a Mi Perfil"
          >
            Hola, {usuario}
          </span>

          <button className="navbar-toggle-btn" onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />} {menuOpen ? 'Cerrar' : 'Menú'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="navbar-dropdown">
          <button className="navbar-menu-item" onClick={() => handleNavigation('/nueva-encuesta')}>
            <FaFileAlt /> Nueva Encuesta
          </button>
          <button className="navbar-menu-item" onClick={() => handleNavigation('/busqueda-rut')}>
            <FaSearch /> Búsqueda por RUT
          </button>
          <button className="navbar-menu-item" onClick={() => handleNavigation('/busqueda-franja')}>
            <FaMapMarkedAlt /> Búsqueda por Franja
          </button>
          <button 
            className="navbar-menu-item" 
            onClick={() => {
              setMenuOpen(false);
              window.open('https://www.municipalidadlagranja.cl/', '_blank');
            }}
          >
            <FaBuilding /> Municipalidad
          </button>
          <hr className="navbar-divider" />
          <button className="navbar-menu-item" onClick={() => handleNavigation('/perfil')}>
            <FaUserCircle /> Mi Perfil
          </button>
          <button className="navbar-menu-item logout" onClick={() => handleNavigation('/login')}>
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        </nav>
      )}
    </header>
  );
}