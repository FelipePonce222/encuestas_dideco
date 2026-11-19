from functools import wraps
from flask import g, jsonify

ROLES_VALIDOS = [
    "Administrador",
    "Coordinador / Supervisor",
    "Encuestador / Digitador",
    "Visualizador / Auditor",
]

ROL_A_CODIGO_DB = {
    "Administrador": "admin",
    "Coordinador / Supervisor": "coordinador",
    "Encuestador / Digitador": "encuestador",
    "Visualizador / Auditor": "visualizador",
}

MATRIZ_PERMISOS = {
    "Administrador": {
        "ver_dashboard",
        "crear_encuesta",
        "buscar_rut",
        "editar_encuesta",
        "eliminar_encuesta",
        "exportar_excel",
        "informes_ver",
        "informes_subir",
        "informes_eliminar",
        "gestionar_usuarios",
        "mi_perfil",
    },
    "Coordinador / Supervisor": {
        "ver_dashboard",
        "crear_encuesta",
        "buscar_rut",
        "editar_encuesta",
        "exportar_excel",
        "informes_ver",
        "informes_subir",
        "mi_perfil",
    },
    "Encuestador / Digitador": {
        "crear_encuesta",
        "buscar_rut",
        "mi_perfil",
    },
    "Visualizador / Auditor": {
        "ver_dashboard",
        "informes_ver",
        "mi_perfil",
    },
}


def normalizar_rol(rol_o_cargo):
    if not rol_o_cargo:
        return "Encuestador / Digitador"
    r = str(rol_o_cargo).strip().lower()
    if "admin" in r:
        return "Administrador"
    if "coord" in r or "superv" in r or "jef" in r:
        return "Coordinador / Supervisor"
    if "visual" in r or "audit" in r:
        return "Visualizador / Auditor"
    if "encuest" in r or "digit" in r or "func" in r:
        return "Encuestador / Digitador"
    return "Encuestador / Digitador"


def rol_para_db(rol_legible):
    norm = normalizar_rol(rol_legible)
    return ROL_A_CODIGO_DB.get(norm, "encuestador")


def tiene_permiso(rol_o_cargo, permiso):
    rol = normalizar_rol(rol_o_cargo)
    return permiso in MATRIZ_PERMISOS.get(rol, set())


def requiere_permiso(permiso):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            funcionario = getattr(g, "funcionario", None)
            if not funcionario:
                return jsonify({"error": "Sesión no válida o expirada."}), 401

            rol_actual = normalizar_rol(funcionario.get("rol") or funcionario.get("cargo"))
            if not tiene_permiso(rol_actual, permiso):
                return jsonify({
                    "error": f"Acceso denegado. El perfil '{rol_actual}' no tiene permiso para esta acción."
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator