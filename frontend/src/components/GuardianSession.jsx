import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Escucha el aviso de "sesión vencida" (lo emite apiFetch cuando el servidor responde 401)
// y lleva al login con un mensaje. No muestra nada en pantalla.
export default function GuardianSesion() {
  const navigate = useNavigate();

  useEffect(() => {
    const alExpirar = () =>
      navigate('/login', {
        replace: true,
        state: { mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' }
      });

    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, [navigate]);

  return null;
}