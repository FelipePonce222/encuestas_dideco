import React from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';

export default function NuevaEncuesta() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar usuario="José" />
      <main style={{ flex: 1, padding: '2rem', textAlign: 'center' }}>
        <h2>Formulario de Nueva Encuesta IVPM</h2>
        <p>Módulo de ingreso de encuestas en terreno en construcción...</p>
      </main>
      <Footer />
    </div>
  );
}