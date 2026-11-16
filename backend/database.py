import os
import sqlite3

from seguridad import es_hash, hashear_password

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

    # Seguridad: toda contraseña guardada en texto plano se convierte a hash (se hace una sola vez).
    pendientes = []
    for fila in cursor.execute("SELECT id_funcionario, password FROM funcionario").fetchall():
        if fila["password"] and not es_hash(fila["password"]):
            pendientes.append((hashear_password(fila["password"]), fila["id_funcionario"]))
    if pendientes:
        cursor.executemany("UPDATE funcionario SET password = ? WHERE id_funcionario = ?", pendientes)
        print(f"[Seguridad] {len(pendientes)} contrasena(s) guardadas en texto plano fueron convertidas a hash.")

    total = cursor.execute("SELECT COUNT(*) FROM funcionario").fetchone()[0]
    if total == 0:
        print("[Aviso] No hay funcionarios registrados. Crea el primero con: python backend/crear_usuario.py")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Base de datos lista en: {DB_PATH}")