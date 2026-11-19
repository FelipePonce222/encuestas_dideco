import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserCircle, 
  FaBars, 
  FaTimes, 
  FaFileAlt, 
  FaSearch, 
  FaBuilding, 
  FaSignOutAlt,
  FaChartPie,
  FaFolderOpen,
  FaUsersCog,
  FaHome
} from 'react-icons/fa';
import logoLaGranja from '../assets/Escudo-y-texto.png';
import {
  obtenerUsuarioActual,
  obtenerRolActual,
  tienePermiso,
  rutaInicioPorRol
} from '../utils/permisos';
import './navbar.css';

export default function Navbar({ usuario }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const usuarioGuardado = obtenerUsuarioActual() || {};
  const nombreMostrar = usuario || usuarioGuardado.nombre || 'Funcionario';
  const rolMostrar = obtenerRolActual(usuarioGuardado);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleNavigation = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className="navbar-header">
      <div className="navbar-topbar">
        <div 
          className="navbar-logo-container" 
          onClick={() => navigate(rutaInicioPorRol())}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={logoLaGranja} 
            alt="Escudo Ilustre Municipalidad de La Granja" 
            className="navbar-logo-img" 
          />
        </div>
        
        <div className="navbar-user-section">
          <span 
            className="navbar-welcome" 
            onClick={() => navigate('/perfil')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
            title="Ir a Mi Perfil"
          >
            <span>Hola, {nombreMostrar}</span>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                padding: '3px 9px',
                borderRadius: '999px',
                fontWeight: 'bold'
              }}
            >
              {rolMostrar}
            </span>
          </span>

          <button className="navbar-toggle-btn" onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />} {menuOpen ? 'Cerrar' : 'Menú'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="navbar-dropdown">
          {tienePermiso('ver_dashboard') && (
            <>
              <button className="navbar-menu-item" onClick={() => handleNavigation('/dashboard')}>
                <FaHome /> Panel Principal
              </button>
              <button className="navbar-menu-item" onClick={() => handleNavigation('/graficos')}>
                <FaChartPie /> Gráficos Estadísticos
              </button>
            </>
          )}

          {tienePermiso('crear_encuesta') && (
            <button className="navbar-menu-item" onClick={() => handleNavigation('/nueva-encuesta')}>
              <FaFileAlt /> Nueva Encuesta
            </button>
          )}

          {tienePermiso('buscar_rut') && (
            <button className="navbar-menu-item" onClick={() => handleNavigation('/busqueda-rut')}>
              <FaSearch /> Búsqueda por RUT
            </button>
          )}

          {tienePermiso('informes_ver') && (
            <button className="navbar-menu-item" onClick={() => handleNavigation('/informes')}>
              <FaFolderOpen /> Informes
            </button>
          )}

          {tienePermiso('gestionar_usuarios') && (
            <button className="navbar-menu-item" onClick={() => handleNavigation('/usuarios')}>
              <FaUsersCog /> Gestión de Usuarios
            </button>
          )}

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
          <button className="navbar-menu-item logout" onClick={handleLogout}>
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        </nav>
      )}
    </header>
  );
}