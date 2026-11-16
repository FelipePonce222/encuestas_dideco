"""
Fechas del sistema: SIEMPRE en formato ISO  'AAAA-MM-DD HH:MM:SS'  (ej. 2026-11-09 16:45:30).

Es el formato que SQLite entiende y que ordena correctamente (de más antigua a más nueva).
La hora la pone el servidor, en hora de Chile, para no depender del reloj de cada celular o
computador que registre la encuesta.
"""
import re
from datetime import datetime

try:
    from zoneinfo import ZoneInfo
    ZONA = ZoneInfo("America/Santiago")
except Exception:
    # Sin base de zonas horarias (típico en Windows sin el paquete 'tzdata'):
    # se usa la hora del propio equipo. Solución: pip install tzdata
    ZONA = None

FORMATO_ISO = "%Y-%m-%d %H:%M:%S"

# 2026-06-26 | 2026-06-26 10:15 | 2026-06-26 10:15:00 | 2026-06-26T10:15:00.123
_ISO = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$")
# Formato que generaba el formulario antiguo (es-CL): 09-11-2026, 16:45:30  (día-mes-año)
_CL = re.compile(
    r"^(\d{1,2})-(\d{1,2})-(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?\s?m\.?)?)?$",
    re.IGNORECASE,
)


def ahora_iso():
    """Fecha y hora actuales (hora de Chile si está disponible) en formato ISO."""
    ahora = datetime.now(ZONA) if ZONA else datetime.now()
    return ahora.strftime(FORMATO_ISO)


def a_iso(texto):
    """Convierte una fecha escrita en formato ISO o es-CL al formato ISO del sistema.

    Devuelve None si el texto está vacío o no se reconoce (nunca adivina).
    """
    t = str(texto if texto is not None else "").replace("\u202f", " ").replace("\u00a0", " ").strip()
    if not t:
        return None

    m = _ISO.match(t)
    if m:
        anio, mes, dia, h, mi, s = m.groups()
        ampm = None
    else:
        m = _CL.match(t)
        if not m:
            return None
        dia, mes, anio, h, mi, s, ampm = m.groups()

    h = int(h or 0)
    if ampm:                       # 12 a. m. = 00:xx   |   1 p. m. = 13:xx
        h = h % 12 + (12 if ampm.lower() == "p" else 0)
    try:
        return datetime(int(anio), int(mes), int(dia), h, int(mi or 0), int(s or 0)).strftime(FORMATO_ISO)
    except ValueError:
        return None