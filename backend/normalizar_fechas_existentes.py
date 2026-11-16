"""
Convierte las fechas de registro ya guardadas (por ejemplo '09-11-2026, 16:45:30') al
formato ISO del sistema ('2026-11-09 16:45:30'), para que se puedan ordenar bien.

SEGURO POR DEFECTO (igual que normalizar_ruts_existentes.py):
  python normalizar_fechas_existentes.py            -> SIMULACIÓN: solo muestra qué haría
  python normalizar_fechas_existentes.py --aplicar  -> hace un RESPALDO y luego aplica

Solo imprime conteos y números de fila (id). Solo modifica la columna fecha_registro;
el JSON original de cada encuesta (datos_completos) queda intacto.
Las fechas que no se reconocen NO se tocan: se listan para revisarlas a mano.
"""
import argparse

import database
from database import get_connection
from fechas import a_iso
from normalizar_ruts_existentes import respaldar


def analizar(conn):
    """Clasifica cada fecha. No modifica nada."""
    filas = conn.execute("SELECT id, fecha_registro FROM vecinos").fetchall()
    r = {
        "total": len(filas),
        "sin_cambio": 0,
        "cambios": [],              # (id, fecha_iso)
        "ids_sin_fecha": [],        # sin fecha (vacía): no hay de dónde sacarla
        "ids_no_reconocidas": [],   # tienen algo escrito, pero no es un formato conocido
    }
    for fila in filas:
        id_, actual = fila["id"], fila["fecha_registro"]
        if actual is None or str(actual).strip() == "":
            r["ids_sin_fecha"].append(id_)
            continue
        nuevo = a_iso(actual)
        if nuevo is None:
            r["ids_no_reconocidas"].append(id_)
        elif nuevo != actual:
            r["cambios"].append((id_, nuevo))
        else:
            r["sin_cambio"] += 1
    return r


def aplicar(conn, cambios):
    with conn:  # una sola transacción: o se aplica todo o nada
        conn.executemany("UPDATE vecinos SET fecha_registro = ? WHERE id = ?",
                         [(nuevo, id_) for id_, nuevo in cambios])


def _mostrar_ids(titulo, ids):
    if not ids:
        return
    muestra = ", ".join(str(i) for i in ids[:40])
    extra = f" ... (+{len(ids) - 40} más)" if len(ids) > 40 else ""
    print(f"\n{titulo}\n   ids: {muestra}{extra}")


def main():
    parser = argparse.ArgumentParser(description="Convierte las fechas existentes al formato ISO.")
    parser.add_argument("--aplicar", action="store_true",
                        help="Aplica los cambios (por defecto solo simula). Hace respaldo antes.")
    args = parser.parse_args()

    print(f"Base de datos: {database.DB_PATH}")
    conn = get_connection()
    r = analizar(conn)

    print(f"\nRegistros revisados:               {r['total']}")
    print(f"Ya están en formato ISO:           {r['sin_cambio']}")
    print(f"Se convertirían:                   {len(r['cambios'])}")
    print(f"Sin fecha:                         {len(r['ids_sin_fecha'])}")
    print(f"Con fecha no reconocida:           {len(r['ids_no_reconocidas'])}")
    _mostrar_ids("Fechas NO reconocidas (no se tocan; revísalas a mano):", r["ids_no_reconocidas"])

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
    print(f"Listo: {len(r['cambios'])} fechas convertidas.")


if __name__ == "__main__":
    main()