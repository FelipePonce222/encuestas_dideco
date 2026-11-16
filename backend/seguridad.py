"""
Seguridad de contraseñas: hash + reglas mínimas.

Las contraseñas NUNCA se guardan tal cual: se guarda un "hash" (una huella irreversible).
Para comprobar un login se calcula el hash de lo que escribió la persona y se compara.
Se usa scrypt (incluido en Python / Werkzeug, no requiere instalar nada).
"""
import re

from werkzeug.security import check_password_hash, generate_password_hash

LARGO_MINIMO = 8
_PREFIJOS_HASH = ("scrypt:", "pbkdf2:")

# Contraseñas demasiado comunes o que estuvieron escritas en el código/repositorio
_PROHIBIDAS = {
    "12345678", "123456789", "1234567890", "password", "contraseña", "contrasena",
    "qwertyui", "abcd1234", "admin123", "contraprueba", "dideco2026", "dideco123",
}


def es_hash(valor):
    """True si el valor guardado ya es un hash (y no una contraseña en texto plano)."""
    return isinstance(valor, str) and valor.startswith(_PREFIJOS_HASH)


def hashear_password(password):
    try:
        return generate_password_hash(password, method="scrypt")
    except (ValueError, AttributeError):          # Python compilado sin scrypt
        return generate_password_hash(password, method="pbkdf2:sha256:600000")


def verificar_password(hash_guardado, password):
    """True solo si 'hash_guardado' es un hash válido y corresponde a 'password'.

    Un valor en texto plano NUNCA se acepta (así nadie puede entrar con contraseñas sin convertir).
    """
    if not es_hash(hash_guardado):
        return False
    try:
        return check_password_hash(hash_guardado, password or "")
    except Exception:
        return False


# Hash de relleno: se verifica contra él cuando el RUT no existe, para que el tiempo de
# respuesta del login no revele qué RUT están registrados.
HASH_FALSO = hashear_password("relleno-que-nadie-usa-9f3a")


def validar_password(password, rut=None):
    """Devuelve un mensaje de error (texto) si la contraseña no es aceptable; None si está bien."""
    if not isinstance(password, str) or not password:
        return "La contraseña no puede estar vacía."
    if password != password.strip():
        return "La contraseña no puede empezar ni terminar con espacios."
    if len(password) < LARGO_MINIMO:
        return f"La contraseña debe tener al menos {LARGO_MINIMO} caracteres."
    if len(set(password)) == 1:
        return "La contraseña no puede ser un solo carácter repetido."
    if password.lower() in _PROHIBIDAS:
        return "Esa contraseña es demasiado común o ya fue expuesta: elige otra."
    if rut:
        # número del RUT sin el dígito verificador (ej. 12345678 en 12345678-5)
        texto_rut = str(rut).strip()
        cuerpo = re.sub(r"\D", "", texto_rut.split("-")[0] if "-" in texto_rut else texto_rut[:-1])
        if len(cuerpo) >= 6 and cuerpo in re.sub(r"\D", "", password):
            return "La contraseña no debe contener tu RUT."
    return None