"""
Ordena los RUT que ya están guardados en la tabla vecinos al formato único
del sistema (12345678-5: sin puntos, con guion, K mayúscula).

SEGURO POR DEFECTO:
  python normalizar_ruts_existentes.py            -> SIMULACIÓN: solo muestra qué haría
  python normalizar_ruts_existentes.py --aplicar  -> hace un RESPALDO y luego aplica los cambios

Solo imprime conteos y números de fila (id): nunca muestra RUT ni nombres.
Solo se modifica la columna 'rut'. El JSON original de cada encuesta
(datos_completos) se deja intacto como registro de lo que se capturó.
"""
import argparse
import os
import re
import sqlite3
from datetime import datetime

import database
from database import get_connection
from rut_utils import SIN_RUT, normalizar_rut, validar_rut

# Valores que en datos antiguos significaban "no hay RUT"
VACIOS = {"", "nan", "none", "null"}


def analizar(conn):
    """Revisa todos los vecinos y clasifica cada RUT. No modifica nada."""
    filas = conn.execute("SELECT id, rut FROM vecinos").fetchall()
    r = {
        "total": len(filas),
        "sin_cambio": 0,
        "cambios": [],            # (id, rut_nuevo)
        "ids_dv_invalido": [],    # tiene forma de RUT pero el dígito verificador no calza
        "ids_formato_raro": [],   # no tiene forma de RUT (ni es SIN RUT)
    }
    for fila in filas:
        id_, rut = fila["id"], fila["rut"]
        actual = "" if rut is None else str(rut).strip()

        if actual.lower() in VACIOS:
            nuevo = SIN_RUT
        else:
            nuevo = normalizar_rut(actual)

        if nuevo != rut:
            r["cambios"].append((id_, nuevo))
        else:
            r["sin_cambio"] += 1

        if nuevo != SIN_RUT:
            if not validar_rut(nuevo):
                if re.fullmatch(r"\d{1,9}-[\dK]", nuevo):
                    r["ids_dv_invalido"].append(id_)      # forma de RUT, dígito verificador malo
                else:
                    r["ids_formato_raro"].append(id_)     # ni siquiera parece un RUT

    # Cuántos RUT distintos tienen más de una encuesta (informativo)
    nuevos = {id_: n for id_, n in r["cambios"]}
    conteo = {}
    for fila in filas:
        valor = nuevos.get(fila["id"], fila["rut"])
        if valor and valor != SIN_RUT:
            conteo[valor] = conteo.get(valor, 0) + 1
    r["ruts_con_varias_encuestas"] = sum(1 for n in conteo.values() if n > 1)
    return r


def respaldar():
    """Copia consistente de la base en backups/ (usa la API de respaldo de SQLite)."""
    carpeta = os.path.join(os.path.dirname(database.DB_PATH), "backups")
    os.makedirs(carpeta, exist_ok=True)
    base = os.path.splitext(os.path.basename(database.DB_PATH))[0]
    destino = os.path.join(carpeta, f"{base}_{datetime.now():%Y%m%d_%H%M%S}.db")
    origen = sqlite3.connect(database.DB_PATH)
    copia = sqlite3.connect(destino)
    origen.backup(copia)
    copia.close()
    origen.close()
    return destino


def aplicar(conn, cambios):
    with conn:  # una sola transacción: o se aplica todo o nada
        conn.executemany("UPDATE vecinos SET rut = ? WHERE id = ?",
                         [(nuevo, id_) for id_, nuevo in cambios])


def _mostrar_ids(titulo, ids):
    if not ids:
        return
    muestra = ", ".join(str(i) for i in ids[:40])
    extra = f" ... (+{len(ids) - 40} más)" if len(ids) > 40 else ""
    print(f"\n{titulo}\n   ids: {muestra}{extra}")


def main():
    parser = argparse.ArgumentParser(description="Normaliza los RUT existentes en la base única.")
    parser.add_argument("--aplicar", action="store_true",
                        help="Aplica los cambios (por defecto solo simula). Hace respaldo antes.")
    args = parser.parse_args()

    print(f"Base de datos: {database.DB_PATH}")
    conn = get_connection()
    r = analizar(conn)

    print(f"\nRegistros revisados:               {r['total']}")
    print(f"Ya están en el formato correcto:   {r['sin_cambio']}")
    print(f"Se normalizarían:                  {len(r['cambios'])}")
    print(f"RUT con más de una encuesta:       {r['ruts_con_varias_encuestas']}")
    _mostrar_ids("RUT con dígito verificador que NO calza (probable error de digitación; revísalos a mano):",
                 r["ids_dv_invalido"])
    _mostrar_ids("Registros cuyo RUT no tiene forma de RUT (revísalos a mano):", r["ids_formato_raro"])

    if not args.aplicar:
        print("\nSIMULACIÓN: no se modificó nada. Para aplicar los cambios ejecuta de nuevo con --aplicar")
        conn.close()
        return

    if not r["cambios"]:
        print("\nNo hay nada que cambiar.")
        conn.close()
        return

    destino = respaldar()
    print(f"\nRespaldo creado en: {destino}")
    aplicar(conn, r["cambios"])
    conn.close()
    print(f"Listo: {len(r['cambios'])} RUT normalizados.")


if __name__ == "__main__":
    main()