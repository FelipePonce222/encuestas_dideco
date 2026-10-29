import React from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';

export default function BusquedaFranja() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar usuario="José" />
      <main style={{ flex: 1, padding: '2rem', textAlign: 'center' }}>
        <h2>Búsqueda por Franja Territorial</h2>
        <p>Módulo de visualización por franjas en construcción...</p>
      </main>
      <Footer />
    </div>
  );
}