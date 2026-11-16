"""
Sesiones con token firmado y protección de TODAS las rutas de la API.

Cómo funciona:
  1. El funcionario inicia sesión (/api/login) y el servidor le entrega un TOKEN firmado.
  2. En cada petición posterior el front envía:  Authorization: Bearer <token>
  3. Antes de ejecutar cualquier ruta /api/*, el servidor verifica la firma, que no haya
     expirado y que el funcionario siga existiendo con la misma contraseña.

La protección es "denegar por defecto": cualquier ruta /api/ nueva exige sesión automáticamente,
salvo las que estén en RUTAS_PUBLICAS (hoy solo el login).

Configuración (variables de entorno, todas opcionales):
  DIDECO_SECRET_KEY    clave con la que se firman los tokens (recomendada en el servidor).
                       Si no existe, se genera una y se guarda en el archivo .secret_key
                       junto a la base de datos. ¡Ese archivo NO debe subirse a GitHub!
  DIDECO_TOKEN_HORAS   duración de la sesión en horas (por defecto 12)
"""
import hashlib
import os
import secrets

from flask import g, jsonify, request
from itsdangerous import BadData, URLSafeTimedSerializer

import database

HORAS_SESION = float(os.environ.get("DIDECO_TOKEN_HORAS", "12"))
RUTAS_PUBLICAS = {"/api/login"}

_SAL = "dideco-sesion-v1"
_claves = {}   # caché: ruta del archivo de clave -> clave


def segundos_de_sesion():
    return int(HORAS_SESION * 3600)


def _clave_secreta():
    desde_entorno = os.environ.get("DIDECO_SECRET_KEY")
    if desde_entorno:
        return desde_entorno

    ruta = os.path.join(os.path.dirname(database.DB_PATH), ".secret_key")
    if ruta not in _claves:
        clave = ""
        if os.path.exists(ruta):
            with open(ruta, encoding="utf-8") as f:
                clave = f.read().strip()
        if len(clave) < 32:                       # no existe (o está dañada): se crea una nueva
            clave = secrets.token_hex(32)
            os.makedirs(os.path.dirname(ruta), exist_ok=True)
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(clave)
            try:
                os.chmod(ruta, 0o600)             # solo el dueño puede leerla (en Windows no aplica)
            except OSError:
                pass
            print(f"[Seguridad] Se creó la clave secreta de sesiones en: {ruta}")
            print("            No subas ese archivo a GitHub (agrégalo al .gitignore).")
        _claves[ruta] = clave
    return _claves[ruta]


def _serializador():
    return URLSafeTimedSerializer(_clave_secreta(), salt=_SAL)


def _huella(hash_guardado):
    """Huella corta de la contraseña guardada: si la contraseña cambia, los tokens antiguos dejan de servir."""
    return hashlib.sha256(str(hash_guardado).encode("utf-8")).hexdigest()[:12]


def emitir_token(funcionario):
    """Token firmado para un funcionario (fila con id_funcionario y password)."""
    return _serializador().dumps({"id": funcionario["id_funcionario"], "h": _huella(funcionario["password"])})


def funcionario_desde_token(token):
    """Devuelve los datos del funcionario si el token es válido; si no, None."""
    if not token or not isinstance(token, str):
        return None
    try:
        datos = _serializador().loads(token, max_age=HORAS_SESION * 3600)
        id_funcionario, huella = datos["id"], datos["h"]
    except (BadData, KeyError, TypeError):
        return None

    conn = database.get_connection()
    fila = conn.execute(
        "SELECT id_funcionario, rut, nombre, cargo, password FROM funcionario WHERE id_funcionario = ?",
        (id_funcionario,)).fetchone()
    conn.close()

    # Si el funcionario fue eliminado o cambió su contraseña, el token ya no vale
    if not fila or huella != _huella(fila["password"]):
        return None
    return {"id": fila["id_funcionario"], "rut": fila["rut"], "nombre": fila["nombre"], "cargo": fila["cargo"]}


def _token_de_la_peticion():
    partes = request.headers.get("Authorization", "").split(None, 1)
    if len(partes) == 2 and partes[0].lower() == "bearer":
        return partes[1].strip()
    return None


def proteger_api(app):
    """Exige sesión en todas las rutas /api/ (menos las públicas)."""

    @app.before_request
    def _exigir_sesion():
        # El OPTIONS es la "consulta previa" del navegador (CORS): no lleva token
        if request.method == "OPTIONS" or not request.path.startswith("/api/"):
            return None
        if request.path in RUTAS_PUBLICAS:
            return None

        funcionario = funcionario_desde_token(_token_de_la_peticion())
        if not funcionario:
            return jsonify({
                "status": "error",
                "codigo": "sesion_invalida",
                "message": "Sesión no válida o expirada. Inicia sesión nuevamente."
            }), 401

        g.funcionario = funcionario   # disponible en la ruta como g.funcionario
        return None