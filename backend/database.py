import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# ÚNICA base de datos del sistema.
#
# Por defecto vive junto al backend: backend/dideco_encuestas.db
# Se puede mover (servidor, exe, etc.) sin tocar el código definiendo la
# variable de entorno DIDECO_DB_PATH con la ruta del archivo.
# Toda la app (app.py, importador.py) obtiene la conexión desde get_connection().
# ---------------------------------------------------------------------------
DB_PATH = os.path.abspath(
    os.path.expanduser(
        os.environ.get("DIDECO_DB_PATH", os.path.join(BASE_DIR, "dideco_encuestas.db"))
    )
)


def get_connection():
    """Abre una conexión a la base única. Filas accesibles por nombre de columna."""
    carpeta = os.path.dirname(DB_PATH)
    if carpeta:
        os.makedirs(carpeta, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Tabla Funcionarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS funcionario (
            id_funcionario INTEGER PRIMARY KEY AUTOINCREMENT,
            rut VARCHAR(13) UNIQUE NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            cargo VARCHAR(50),
            password VARCHAR(100) NOT NULL
        )
    ''')

    # 2. Tabla Vecinos
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
            nivel_riesgo TEXT,
            datos_completos TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migración suave: agrega columnas si la base existía antes de estos cambios
    for columna, tipo in (("fecha_registro", "DATETIME"), ("datos_completos", "TEXT")):
        try:
            cursor.execute(f"ALTER TABLE vecinos ADD COLUMN {columna} {tipo}")
        except sqlite3.OperationalError:
            pass  # la columna ya existe

    # Índice para que la búsqueda por RUT sea rápida
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_vecinos_rut ON vecinos(rut)")

    # Usuarios de prueba (se reemplazarán en la etapa de seguridad)
    usuarios_prueba = [
        ('12345678-9', 'José Martínez', 'Trabajador Social', 'admin123'),
        ('21555499-6', 'Felipe Ponce', 'Ingeniero Informático', 'contraprueba'),
        ('98765432-1', 'Camila Silva', 'Coordinadora DIDECO', 'dideco2026')
    ]

    for rut, nombre, cargo, password in usuarios_prueba:
        cursor.execute("SELECT 1 FROM funcionario WHERE rut = ?", (rut,))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO funcionario (rut, nombre, cargo, password)
                VALUES (?, ?, ?, ?)
            ''', (rut, nombre, cargo, password))

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Base de datos lista en: {DB_PATH}")