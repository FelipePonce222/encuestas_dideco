"""
Mi Perfil: cada funcionario ve y actualiza SUS datos de contacto y cambia SU contraseña.

Rutas (todas exigen sesión; el funcionario sale del token, nunca de lo que envíe el navegador):
  GET  /api/perfil             datos del funcionario que inició sesión
  PUT  /api/perfil             actualiza nombre, correo y teléfono
  POST /api/perfil/password    cambia la contraseña (pide la actual)

El RUT y el cargo NO se pueden modificar desde aquí: los administra DIDECO
(con crear_usuario.py).
"""
import re

from flask import Blueprint, g, jsonify, request

from auth import emitir_token, segundos_de_sesion
from database import get_connection
from seguridad import hashear_password, validar_password, verificar_password

perfil_bp = Blueprint("perfil", __name__)

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def normalizar_telefono(texto):
    """Lleva un teléfono al formato +56912345678. Vacío -> None. Si no es válido, lanza ValueError.

    Acepta: '+56 9 1234 5678', '9 1234 5678', '56912345678', '(2) 2345 6789'.
    Los números chilenos son +56 más 9 dígitos; también se aceptan números internacionales.
    """
    t = str(texto or "").strip()
    if not t:
        return None
    solo = re.sub(r"[\s\-().]", "", t)
    if not re.fullmatch(r"\+?\d+", solo):
        raise ValueError("Teléfono inválido")

    digitos = solo.lstrip("+")
    if not solo.startswith("+"):
        if len(digitos) == 9:                              # 9XXXXXXXX (móvil) o fijo con código de área
            digitos = "56" + digitos
        elif not (digitos.startswith("56") and len(digitos) == 11):
            raise ValueError("Teléfono inválido")
    if not 8 <= len(digitos) <= 15:
        raise ValueError("Teléfono inválido")
    if digitos.startswith("56") and len(digitos) != 11:    # un número chileno es 56 + 9 dígitos
        raise ValueError("Teléfono inválido")
    return "+" + digitos


def _perfil_actual():
    conn = get_connection()
    fila = conn.execute(
        "SELECT rut, nombre, cargo, email, telefono FROM funcionario WHERE id_funcionario = ?",
        (g.funcionario["id"],)).fetchone()
    conn.close()
    return {"rut": fila["rut"], "nombre": fila["nombre"], "cargo": fila["cargo"] or "",
            "email": fila["email"] or "", "telefono": fila["telefono"] or ""}


def _error(mensaje, errores=None):
    cuerpo = {"status": "error", "message": mensaje}
    if errores:
        cuerpo["errores"] = errores
    return jsonify(cuerpo), 400      # 400 y NO 401: un 401 haría que el front cierre la sesión


@perfil_bp.route("/api/perfil", methods=["GET"])
def obtener_perfil():
    return jsonify(_perfil_actual())


@perfil_bp.route("/api/perfil", methods=["PUT"])
def actualizar_perfil():
    data = request.get_json(silent=True) or {}
    cambios, errores = {}, {}

    if "nombre" in data:
        nombre = " ".join(str(data["nombre"] or "").split())
        if not 2 <= len(nombre) <= 100:
            errores["nombre"] = "El nombre debe tener entre 2 y 100 caracteres."
        else:
            cambios["nombre"] = nombre

    if "email" in data:
        email = str(data["email"] or "").strip().lower()
        if email and (len(email) > 120 or not _EMAIL.match(email)):
            errores["email"] = "El correo no es válido (ej. nombre@dominio.cl)."
        else:
            cambios["email"] = email or None

    if "telefono" in data:
        try:
            cambios["telefono"] = normalizar_telefono(data["telefono"])
        except ValueError:
            errores["telefono"] = "El teléfono no es válido (ej. +56 9 1234 5678)."

    if errores:
        return _error("Revisa los datos ingresados.", errores)

    if cambios:   # solo se tocan las columnas permitidas; el RUT, el cargo y la contraseña jamás
        columnas = ", ".join(f"{c} = ?" for c in cambios)
        conn = get_connection()
        with conn:
            conn.execute(f"UPDATE funcionario SET {columnas} WHERE id_funcionario = ?",
                         (*cambios.values(), g.funcionario["id"]))
        conn.close()

    return jsonify({"status": "ok", "message": "Perfil actualizado correctamente.", "perfil": _perfil_actual()})


@perfil_bp.route("/api/perfil/password", methods=["POST"])
def cambiar_password():
    data = request.get_json(silent=True) or {}
    actual = str(data.get("password_actual") or "").strip()
    nueva = str(data.get("password_nueva") or "")

    conn = get_connection()
    fila = conn.execute("SELECT rut, password FROM funcionario WHERE id_funcionario = ?",
                        (g.funcionario["id"],)).fetchone()

    if not verificar_password(fila["password"], actual):
        conn.close()
        return _error("La contraseña actual no es correcta.", {"password_actual": "No coincide."})

    problema = validar_password(nueva, fila["rut"])
    if problema:
        conn.close()
        return _error(problema, {"password_nueva": problema})
    if nueva == actual:
        conn.close()
        return _error("La nueva contraseña debe ser distinta a la actual.",
                      {"password_nueva": "Debe ser distinta a la actual."})

    nuevo_hash = hashear_password(nueva)
    with conn:
        conn.execute("UPDATE funcionario SET password = ? WHERE id_funcionario = ?",
                     (nuevo_hash, g.funcionario["id"]))
    conn.close()

    # Al cambiar la contraseña, los tokens anteriores (de este y otros dispositivos) dejan de valer.
    # Se entrega uno nuevo para que esta sesión continúe.
    token = emitir_token({"id_funcionario": g.funcionario["id"], "password": nuevo_hash})
    return jsonify({"status": "ok", "message": "Contraseña actualizada. Tus otras sesiones se cerraron.",
                    "token": token, "expira_en": segundos_de_sesion()})