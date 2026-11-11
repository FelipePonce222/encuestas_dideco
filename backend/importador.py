"""
Importador único de encuestas desde Excel hacia la base única (tabla vecinos).

Reemplaza a importar_datos.py e ImportarFranjas.py. Se usa de dos formas:

  1) Desde la API:            POST /api/importar-excel   (lo llama app.py)
  2) Desde la terminal:       python importador.py "archivo.xlsx" --franja "Franja 1"

Si el mismo Excel se importa dos veces no se duplican registros: se omiten los
que ya existen con el mismo RUT y la misma 'Marca temporal'.
"""
import argparse
import json
import os
import sys

import pandas as pd

from IVPM_calculator import calcular_ivpm_registro
import database
from database import get_connection, init_db
from rut_utils import SIN_RUT, normalizar_rut

COL_RUT = '2) Rut de la persona mayor:'
COL_NOMBRE = '1) Nombre Completo de la persona mayor:'
COL_EDAD = '5) Edad:'
COL_DIRECCION = '1) Escribir dirección completa: '
COL_UV = '2) Seleccionar Número de Unidad Vecinal:'
COL_HALLAZGO = '5) Hallazgo/Situación de la Persona Mayor:'
COL_FECHA = 'Marca temporal'


def _texto(valor):
    """Texto limpio; los vacíos (NaN/None) quedan como ''."""
    if valor is None or pd.isna(valor):
        return ''
    return str(valor).strip()


def _entero(valor):
    """Convierte a int nativo de Python (sqlite no guarda bien numpy.int64)."""
    try:
        if valor is None or pd.isna(valor):
            return None
        return int(float(valor))
    except (ValueError, TypeError):
        return None


def importar_dataframe(df, franja="Franja 1"):
    """Inserta las filas del DataFrame en la tabla vecinos.

    Retorna {'insertados': n, 'duplicados': n, 'omitidos': n}.
    """
    conn = get_connection()
    cursor = conn.cursor()
    insertados = duplicados = omitidos = 0

    for _, row in df.iterrows():
        rut = normalizar_rut(_texto(row.get(COL_RUT)))
        nombre = _texto(row.get(COL_NOMBRE))

        # Fila vacía: no aporta nada
        if not rut and not nombre:
            omitidos += 1
            continue

        rut = rut or SIN_RUT

        fecha = _texto(row.get(COL_FECHA)) or None

        # Evitar duplicados al reimportar el mismo archivo
        if fecha:
            cursor.execute(
                "SELECT 1 FROM vecinos WHERE rut = ? AND fecha_registro = ?",
                (rut, fecha),
            )
            if cursor.fetchone():
                duplicados += 1
                continue

        score, nivel, _ = calcular_ivpm_registro(row)

        # La fila completa queda guardada como JSON (alimenta el Excel de informes)
        datos = {str(col): _texto(row[col]) for col in df.columns}

        cursor.execute('''
            INSERT INTO vecinos (rut, nombre, edad, direccion, unidad_vecinal, franja,
                                 hallazgo, ivpm_score, nivel_riesgo, datos_completos, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            rut,
            nombre,
            _entero(row.get(COL_EDAD)),
            _texto(row.get(COL_DIRECCION)),
            _texto(row.get(COL_UV)),
            franja,
            _texto(row.get(COL_HALLAZGO)),
            score,
            nivel,
            json.dumps(datos, ensure_ascii=False),
            fecha,
        ))
        insertados += 1

    conn.commit()
    conn.close()
    return {'insertados': insertados, 'duplicados': duplicados, 'omitidos': omitidos}


def main():
    parser = argparse.ArgumentParser(description="Importa encuestas desde uno o más Excel.")
    parser.add_argument("archivos", nargs="+", help="Ruta(s) de los archivos .xlsx")
    parser.add_argument("--franja", default="Franja 1", help="Nombre de la franja (por defecto: Franja 1)")
    args = parser.parse_args()

    init_db()
    print(f"Base de datos: {database.DB_PATH}")

    for ruta in args.archivos:
        if not os.path.exists(ruta):
            print(f"[ERROR] No existe el archivo: {ruta}")
            continue
        try:
            df = pd.read_excel(ruta)
        except Exception as e:
            print(f"[ERROR] No se pudo leer {ruta}: {e}")
            continue
        r = importar_dataframe(df, franja=args.franja)
        print(f"{os.path.basename(ruta)}: {r['insertados']} insertados, "
              f"{r['duplicados']} duplicados omitidos, {r['omitidos']} filas vacías.")


if __name__ == "__main__":
    sys.exit(main())