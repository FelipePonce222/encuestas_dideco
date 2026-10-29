import React from 'react';
import { FaGlobe, FaPhone, FaMapMarkerAlt, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Sección 1: Info Institucional */}
        <div className="footer-section">
          <h3>Ilustre Municipalidad de La Granja</h3>
          <p>
            Dirección de Desarrollo Comunitario (DIDECO)<br />
            Sistema de Encuestas para el Adulto Mayor.
          </p>
        </div>

        {/* Sección 2: Contacto */}
        <div className="footer-section">
          <h3>Contacto & Ubicación</h3>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <FaMapMarkerAlt /> Américo Vespucio #00500, La Granja
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <FaPhone /> +56 2 2550 3700
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaGlobe />
            <a 
              href="https://www.municipalidadlagranja.cl/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#81c784', textDecoration: 'underline' }}
            >
              municipalidadlagranja.cl
            </a>
          </p>
        </div>

        {/* Sección 3: Enlaces Rápido */}
        <div className="footer-section">
          <h3>Soporte del Sistema</h3>
          <ul className="footer-links">
            <li><a href="#ayuda">Guía de Uso para Funcionarios</a></li>
            <li><a href="#reporte">Reportar un Problema</a></li>
            <li><a href="#privacidad">Política de Protección de Datos</a></li>
          </ul>
        </div>
      </div>

      {/* Pie inferior con derechos y redes */}
      <div className="footer-bottom">
        <p>© {currentYear} DIDECO - La Granja. Todos los derechos reservados.</p>
        <div className="footer-socials">
          <a href="https://www.facebook.com/MunicipalidadLaGranja" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FaFacebook />
          </a>
          <a href="https://www.instagram.com/muni_lagranja/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://twitter.com/munilagranja" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <FaTwitter />
          </a>
        </div>
      </div>
    </footer>
  );
}