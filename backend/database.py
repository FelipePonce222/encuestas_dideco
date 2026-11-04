import sqlite3

DB_FILE = "dideco_encuestas.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
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

    # ⚡ Migración suave: Intentar agregar la columna por si la BD ya existía previa a este cambio
    try:
        cursor.execute("ALTER TABLE vecinos ADD COLUMN fecha_registro DATETIME")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE vecinos ADD COLUMN datos_completos TEXT")
    except sqlite3.OperationalError:
        pass

    # Usuarios de prueba
    usuarios_prueba = [
        ('12345678-9', 'José Martínez', 'Trabajador Social', 'admin123'),
        ('21555499-6', 'Felipe Ponce', 'Ingeniero Informático', 'contraprueba'),
        ('98765432-1', 'Camila Silva', 'Coordinadora DIDECO', 'dideco2026')
    ]

    for rut, nombre, cargo, password in usuarios_prueba:
        cursor.execute("SELECT * FROM funcionario WHERE rut = ?", (rut,))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO funcionario (rut, nombre, cargo, password)
                VALUES (?, ?, ?, ?)
            ''', (rut, nombre, cargo, password))

    conn.commit()
    conn.close()
    print("✅ Base de datos SQLite inicializada con campo de fecha_registro.")

if __name__ == "__main__":
    init_db()