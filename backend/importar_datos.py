import os
import sqlite3
import pandas as pd
from IVPM_calculator import calcular_ivpm_registro

# Obtener la ruta absoluta de la carpeta raíz (encuestas_dideco)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Definir rutas absolutas independientes de la terminal
EXCEL_PATH = os.path.join(BASE_DIR, '19 DE JUNIO (FRANJA 1).xlsx')
DB_PATH = os.path.join(BASE_DIR, 'backend', 'dideco_encuestas.db')

def cargar_excel_a_db():
    print(f"Buscando archivo Excel en: {EXCEL_PATH}")
    
    if not os.path.exists(EXCEL_PATH):
        print("❌ Error: No se encontró el archivo Excel en la ruta especificada.")
        print("Asegúrate de que el archivo '19 DE JUNIO (FRANJA 1).xlsx' esté en la carpeta raíz del proyecto.")
        return

    try:
        df = pd.read_excel(EXCEL_PATH)
        print(f"✅ Archivo encontrado. Total registros a procesar: {len(df)}")
    except Exception as e:
        print(f"❌ Error al leer el archivo Excel: {e}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Crear tabla de vecinos si no existe
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vecinos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rut TEXT,
            nombre TEXT,
            edad INTEGER,
            direccion TEXT,
            unidad_vecinal TEXT,
            franja TEXT,
            hallazgo TEXT,
            ivpm_score REAL,
            nivel_riesgo TEXT
        )
    ''')

    registros_insertados = 0

    for idx, row in df.iterrows():
        score, nivel, _ = calcular_ivpm_registro(row)
        
        rut = str(row.get('2) Rut de la persona mayor:', '')).strip()
        nombre = str(row.get('1) Nombre Completo de la persona mayor:', '')).strip()
        edad = row.get('5) Edad:', None)
        direccion = str(row.get('1) Escribir dirección completa: ', '')).strip()
        uv = str(row.get('2) Seleccionar Número de Unidad Vecinal:', '')).strip()
        hallazgo = str(row.get('5) Hallazgo/Situación de la Persona Mayor:', '')).strip()

        cursor.execute('''
            INSERT INTO vecinos (rut, nombre, edad, direccion, unidad_vecinal, franja, hallazgo, ivpm_score, nivel_riesgo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (rut, nombre, edad, direccion, uv, "Franja 1", hallazgo, score, nivel))
        
        registros_insertados += 1

    conn.commit()
    conn.close()
    print(f"🎉 ¡Éxito total! Se procesaron e insertaron {registros_insertados} registros en 'dideco_encuestas.db'.")

if __name__ == "__main__":
    cargar_excel_a_db()