import os
import glob
import json
import sqlite3
import pandas as pd

# 1. Configuración de rutas absolutas (Para evitar errores de 'unable to open database file')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Raíz del proyecto
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
DB_PATH = os.path.join(INSTANCE_DIR, 'dideco.db')

# Crear la carpeta 'instance' si no existe
os.makedirs(INSTANCE_DIR, exist_ok=True)

# Buscar los archivos Excel en la raíz del proyecto
CARPETA_DATOS = BASE_DIR


def limpiar_rut(rut_raw):
    """Limpia puntos, guiones y espacios para estandarizar el RUT"""
    if pd.isna(rut_raw):
        return ""
    rut_str = str(rut_raw).upper().replace('.', '').replace('-', '').strip()
    return rut_str


def cargar_excel_franja(filepath):
    nombre_archivo = os.path.basename(filepath)
    print(f"🚀 Procesando archivo: {nombre_archivo}")

    try:
        df = pd.read_excel(filepath)
    except Exception as e:
        print(f"❌ Error al leer {nombre_archivo}: {e}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Asegurar la estructura de la tabla encuestas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS encuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rut TEXT UNIQUE,
            nombre TEXT,
            direccion TEXT,
            telefono TEXT,
            fecha_registro TEXT,
            archivo_origen TEXT,
            respuestas_json TEXT
        )
    """)

    registros_procesados = 0

    for _, row in df.iterrows():
        # Extraer campos clave según la estructura de tu Excel
        rut = limpiar_rut(row.get('2) Rut de la persona mayor:'))
        nombre = str(row.get('1) Nombre Completo de la persona mayor:', '')).strip()
        direccion = str(row.get('1) Escribir dirección completa: ', '')).strip()
        telefono = str(row.get('3) Número de teléfono de la persona mayor:', '')).strip()
        fecha_registro = str(row.get('Marca temporal', ''))

        # Si el registro no tiene un RUT válido, se omite
        if not rut or rut == 'NAN':
            continue

        # Convertir la fila completa a un diccionario y luego a JSON
        respuestas_dict = {}
        for col in df.columns:
            val = row[col]
            respuestas_dict[str(col)] = "" if pd.isna(val) else str(val).strip()

        respuestas_json = json.dumps(respuestas_dict, ensure_ascii=False)

        # Upsert: Inserta o actualiza por RUT para evitar duplicados
        cursor.execute("""
            INSERT INTO encuestas (rut, nombre, direccion, telefono, fecha_registro, archivo_origen, respuestas_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(rut) DO UPDATE SET
                nombre = excluded.nombre,
                direccion = excluded.direccion,
                telefono = excluded.telefono,
                fecha_registro = excluded.fecha_registro,
                archivo_origen = excluded.archivo_origen,
                respuestas_json = excluded.respuestas_json
        """, (rut, nombre, direccion, telefono, fecha_registro, nombre_archivo, respuestas_json))

        registros_procesados += 1

    conn.commit()
    conn.close()
    print(f"✅ Finalizado: {nombre_archivo} ({registros_procesados} registros insertados/actualizados).\n")


if __name__ == '__main__':
    # Buscar todos los archivos .xlsx y .xls en la raíz del proyecto
    patron = os.path.join(CARPETA_DATOS, '*.xls*')
    archivos = glob.glob(patron)

    # Filtrar archivos temporales ocultos de Excel (los que empiezan con ~$)
    archivos_validos = [f for f in archivos if not os.path.basename(f).startswith('~$')]

    if not archivos_validos:
        print("⚠️ No se encontraron archivos Excel para procesar en la carpeta raíz.")
    else:
        print(f"📦 Se encontraron {len(archivos_validos)} archivo(s) Excel. Iniciando carga...\n")
        for archivo in archivos_validos:
            cargar_excel_franja(archivo)

        print("🎉 ¡Carga masiva completada con éxito!")