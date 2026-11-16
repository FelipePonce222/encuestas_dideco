"""Administración de funcionarios (usuarios del sistema). Lo usa crear_usuario.py."""
from database import get_connection
from rut_utils import normalizar_rut, validar_rut
from seguridad import es_hash, hashear_password, validar_password


def crear_o_actualizar(rut, nombre=None, cargo=None, password=None):
    """Crea un funcionario o, si el RUT ya existe, actualiza su contraseña (y nombre/cargo si se indican).

    Retorna 'creado' o 'actualizado'. Lanza ValueError con un mensaje claro si algo no es válido.
    """
    rut = normalizar_rut(rut)
    if not validar_rut(rut):
        raise ValueError("RUT inválido: revisa el número y el dígito verificador.")

    error = validar_password(password, rut)
    if error:
        raise ValueError(error)

    nombre = (nombre or "").strip() or None
    cargo = (cargo or "").strip() or None
    hash_nuevo = hashear_password(password)

    conn = get_connection()
    try:
        existe = conn.execute("SELECT id_funcionario FROM funcionario WHERE rut = ?", (rut,)).fetchone()
        with conn:
            if existe:
                conn.execute(
                    "UPDATE funcionario SET password = ?, nombre = COALESCE(?, nombre), cargo = COALESCE(?, cargo) "
                    "WHERE rut = ?", (hash_nuevo, nombre, cargo, rut))
                return "actualizado"
            if not nombre:
                raise ValueError("El nombre es obligatorio para crear un funcionario.")
            conn.execute("INSERT INTO funcionario (rut, nombre, cargo, password) VALUES (?, ?, ?, ?)",
                         (rut, nombre, cargo or "", hash_nuevo))
            return "creado"
    finally:
        conn.close()


def listar():
    """Lista de funcionarios (sin contraseñas)."""
    conn = get_connection()
    filas = conn.execute("SELECT rut, nombre, cargo, password FROM funcionario ORDER BY id_funcionario").fetchall()
    conn.close()
    return [{"rut": f["rut"], "nombre": f["nombre"], "cargo": f["cargo"], "protegida": es_hash(f["password"])}
            for f in filas]


def eliminar(rut):
    """Elimina un funcionario. Retorna True si existía."""
    rut = normalizar_rut(rut)
    conn = get_connection()
    with conn:
        cursor = conn.execute("DELETE FROM funcionario WHERE rut = ?", (rut,))
    conn.close()
    return cursor.rowcount > 0