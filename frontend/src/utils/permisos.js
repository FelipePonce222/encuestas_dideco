export const ROLES_SISTEMA = [
  'Administrador',
  'Coordinador / Supervisor',
  'Encuestador / Digitador',
  'Visualizador / Auditor',
];

const MATRIZ_FRONTEND = {
  'Administrador': [
    'ver_dashboard',
    'crear_encuesta',
    'buscar_rut',
    'editar_encuesta',
    'eliminar_encuesta',
    'exportar_excel',
    'informes_ver',
    'informes_subir',
    'informes_eliminar',
    'gestionar_usuarios',
    'mi_perfil',
  ],
  'Coordinador / Supervisor': [
    'ver_dashboard',
    'crear_encuesta',
    'buscar_rut',
    'editar_encuesta',
    'exportar_excel',
    'informes_ver',
    'informes_subir',
    'mi_perfil',
  ],
  'Encuestador / Digitador': [
    'crear_encuesta',
    'buscar_rut',
    'mi_perfil',
  ],
  'Visualizador / Auditor': [
    'ver_dashboard',
    'informes_ver',
    'mi_perfil',
  ],
};

export function normalizarRol(cargoORol) {
  if (!cargoORol) return 'Encuestador / Digitador';
  const r = String(cargoORol).trim().toLowerCase();
  if (r.includes('admin')) return 'Administrador';
  if (r.includes('coord') || r.includes('superv') || r.includes('jef')) return 'Coordinador / Supervisor';
  if (r.includes('visual') || r.includes('audit')) return 'Visualizador / Auditor';
  if (r.includes('encuest') || r.includes('digit') || r.includes('func')) return 'Encuestador / Digitador';
  return 'Encuestador / Digitador';
}

export function obtenerUsuarioActual() {
  try {
    const raw = localStorage.getItem('usuario') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function obtenerRolActual(usuarioParam = null) {
  const usuario = usuarioParam || obtenerUsuarioActual();
  if (!usuario) return 'Encuestador / Digitador';
  return normalizarRol(usuario.rol || usuario.cargo);
}

export function tienePermiso(permiso, usuarioParam = null) {
  const usuario = usuarioParam || obtenerUsuarioActual();
  if (!usuario) return false;
  const rol = obtenerRolActual(usuario);
  return (MATRIZ_FRONTEND[rol] || []).includes(permiso);
}

export function rutaInicioPorRol(usuarioParam = null) {
  return tienePermiso('ver_dashboard', usuarioParam) ? '/dashboard' : '/nueva-encuesta';
}