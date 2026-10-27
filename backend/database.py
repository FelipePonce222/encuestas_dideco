import sqlite3
import os

# Nombre del archivo de base de datos local para desarrollo
DB_FILE = "dideco_local.db"

def get_connection():
    """Retorna una conexión a la base de datos local (SQLite)"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Para acceder a los campos por nombre de columna
    return conn

def init_db():
    """Crea las tablas básicas y datos de prueba para desarrollo"""
    conn = get_connection()
    cursor = conn.cursor()

    # Tabla Funcionario / Cuenta de prueba
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS funcionario (
            id_funcionario INTEGER PRIMARY KEY AUTOINCREMENT,
            rut VARCHAR(13) UNIQUE NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            cargo VARCHAR(50),
            password VARCHAR(100) NOT NULL
        )
    ''')

    # Insertar un funcionario de prueba si no existe
    cursor.execute("SELECT * FROM funcionario WHERE rut = '12345678-9'")
    if not cursor.fetchone():
        cursor.execute('''
            INSERT INTO funcionario (rut, nombre, cargo, password)
            VALUES ('12345678-9', 'Jose Martinez', 'Trabajador Social', 'admin123')
        ''')

    conn.commit()
    conn.close()
    print("✅ Base de datos local SQLite inicializada correctamente.")

if __name__ == "__main__":
    init_db()