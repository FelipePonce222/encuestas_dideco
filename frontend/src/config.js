// ---------------------------------------------------------------------------
// ÚNICA configuración de la API del frontend.
//
// La URL del backend se define en frontend/.env con la variable VITE_API_URL.
// Si no existe, se usa http://localhost:5000 (desarrollo en tu computador).
//
// Nota: Vite incorpora este valor al compilar (npm run build), por lo que para
// el exe y la apk se compila con la URL del servidor definitivo.
// ---------------------------------------------------------------------------
const urlConfigurada = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Se quita cualquier "/" final para que `${API_URL}/api/...` nunca quede con "//"
export const API_URL = urlConfigurada.replace(/\/+$/, '');