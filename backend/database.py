import sqlite3

DB_FILE = "dideco_encuestas.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS funcionario (
            id_funcionario INTEGER PRIMARY KEY AUTOINCREMENT,
            rut VARCHAR(13) UNIQUE NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            cargo VARCHAR(50),
            password VARCHAR(100) NOT NULL
        )
    ''')

    # Lista con los 3 usuarios de prueba
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
    print("✅ Base de datos SQLite inicializada con los 3 usuarios de prueba.")

if __name__ == "__main__":
    init_db()