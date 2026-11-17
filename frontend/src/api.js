// ---------------------------------------------------------------------------
// Sesión y llamadas a la API.
//
//  - guardarSesion(respuestaDelLogin)  guarda el token y los datos del funcionario
//  - cerrarSesion()                    borra todo (cerrar sesión)
//  - haySesion()                       true si hay token y todavía no expira
//  - apiFetch(url, opciones)           igual que fetch, pero agrega el token a cada petición.
//                                      Si el servidor responde 401 (sesión vencida o inválida),
//                                      cierra la sesión y avisa para volver al login.
// ---------------------------------------------------------------------------
const TOKEN = 'token';
const EXPIRA = 'token_expira';
const USUARIO = 'usuario';

export function guardarSesion({ token, expira_en, user }) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(EXPIRA, String(Date.now() + Number(expira_en || 0) * 1000));
  localStorage.setItem(USUARIO, JSON.stringify(user || {}));
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(EXPIRA);
  localStorage.removeItem(USUARIO);
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN);
}

export function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USUARIO) || '{}');
  } catch {
    return {};
  }
}

// Actualiza datos del funcionario guardados en el navegador (ej. el nombre que muestra el menú)
export function actualizarUsuario(parcial) {
  localStorage.setItem(USUARIO, JSON.stringify({ ...obtenerUsuario(), ...parcial }));
}

// Reemplaza el token de la sesión actual (al cambiar la contraseña el servidor entrega uno nuevo)
export function actualizarToken({ token, expira_en }) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(EXPIRA, String(Date.now() + Number(expira_en || 0) * 1000));
}

export function haySesion() {
  const expira = Number(localStorage.getItem(EXPIRA) || 0);
  return Boolean(obtenerToken()) && Date.now() < expira;
}

export async function apiFetch(url, opciones = {}) {
  const headers = { ...(opciones.headers || {}) };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(url, { ...opciones, headers });

  if (respuesta.status === 401) {
    cerrarSesion();
    window.dispatchEvent(new Event('sesion-expirada'));
  }
  return respuesta;
}