"""Administración de funcionarios (usuarios del sistema)."""
from database import get_connection
from rut_utils import normalizar_rut, validar_rut
from seguridad import es_hash, hashear_password, validar_password
from permisos import rol_para_db


def crear_o_actualizar(rut, nombre=None, cargo=None, password=None, rol=None):
    """Crea un funcionario o, si el RUT ya existe, actualiza su contraseña, cargo y rol."""
    rut = normalizar_rut(rut)
    if not validar_rut(rut):
        raise ValueError("RUT inválido: revisa el número y el dígito verificador.")

    error = validar_password(password, rut)
    if error:
        raise ValueError(error)

    nombre = (nombre or "").strip() or None
    cargo = (cargo or "").strip() or None
    rol_db = rol_para_db(rol or cargo) if (rol or cargo) else None
    hash_nuevo = hashear_password(password)

    conn = get_connection()
    try:
        existe = conn.execute("SELECT id_funcionario FROM funcionario WHERE rut = ?", (rut,)).fetchone()
        with conn:
            if existe:
                conn.execute(
                    "UPDATE funcionario "
                    "SET password = ?, nombre = COALESCE(?, nombre), "
                    "cargo = COALESCE(?, cargo), rol = COALESCE(?, rol) "
                    "WHERE rut = ?",
                    (hash_nuevo, nombre, cargo, rol_db, rut)
                )
                return "actualizado"
            if not nombre:
                raise ValueError("El nombre es obligatorio para crear un funcionario.")
            conn.execute(
                "INSERT INTO funcionario (rut, nombre, cargo, rol, password) VALUES (?, ?, ?, ?, ?)",
                (rut, nombre, cargo or rol or "", rol_db or "encuestador", hash_nuevo)
            )
            return "creado"
    finally:
        conn.close()


def listar():
    """Lista de funcionarios (sin contraseñas)."""
    conn = get_connection()
    filas = conn.execute(
        "SELECT rut, nombre, cargo, rol, password FROM funcionario ORDER BY id_funcionario"
    ).fetchall()
    conn.close()
    return [
        {
            "rut": f["rut"],
            "nombre": f["nombre"],
            "cargo": f["cargo"],
            "rol": f["rol"],
            "protegida": es_hash(f["password"])
        }
        for f in filas
    ]


def eliminar(rut):
    """Elimina un funcionario. Retorna True si existía."""
    rut = normalizar_rut(rut)
    conn = get_connection()
    with conn:
        cursor = conn.execute("DELETE FROM funcionario WHERE rut = ?", (rut,))
    conn.close()
    return cursor.rowcount > 0