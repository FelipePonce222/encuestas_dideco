"""
Utilidades de RUT chileno: un único formato para guardar y buscar.

Formato oficial del sistema:  12345678-5
  - sin puntos
  - con guion antes del dígito verificador
  - K siempre en mayúscula
  - sin ceros a la izquierda
"""
import re

# Valor que se guarda cuando la encuesta no tiene RUT
SIN_RUT = "SIN RUT"

# cuerpo de 1 a 9 dígitos + dígito verificador (número o K)
_PATRON_RUT = re.compile(r"\d{1,9}[\dK]")


def normalizar_rut(texto):
    """Lleva cualquier forma de escribir un RUT al formato del sistema.

    '12.345.678-5', '12345678 5', '123456785' y '12345678-5' -> '12345678-5'
    '7.654.321-k' -> '7654321-K'

    Si el texto no tiene forma de RUT (por ejemplo 'SIN RUT') se devuelve sin
    cambios (solo sin espacios sobrantes): nunca se destruye un dato.
    """
    original = str(texto if texto is not None else "").strip()
    limpio = re.sub(r"[.\s-]", "", original).upper()

    if _PATRON_RUT.fullmatch(limpio):
        cuerpo, dv = limpio[:-1], limpio[-1]
        cuerpo = cuerpo.lstrip("0") or "0"
        return f"{cuerpo}-{dv}"
    return original


def calcular_dv(cuerpo):
    """Dígito verificador (módulo 11) de la parte numérica del RUT."""
    suma, factor = 0, 2
    for digito in reversed(str(cuerpo)):
        suma += int(digito) * factor
        factor = 2 if factor == 7 else factor + 1
    resto = 11 - (suma % 11)
    return {11: "0", 10: "K"}.get(resto, str(resto))


def validar_rut(texto):
    """True si el RUT tiene formato correcto y su dígito verificador coincide."""
    rut = normalizar_rut(texto)
    if not re.fullmatch(r"\d{1,9}-[\dK]", rut):
        return False
    cuerpo, dv = rut.split("-")
    if int(cuerpo) == 0:
        return False
    return calcular_dv(cuerpo) == dv