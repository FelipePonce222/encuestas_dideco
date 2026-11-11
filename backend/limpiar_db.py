# backend/limpiar_db.py
from database import get_db_connection

def resetear_tabla():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Vacía la tabla de encuestas
    cursor.execute("DELETE FROM encuestas;")
    
    # Reinicia el contador autoincremental del ID
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='encuestas';")
    
    conn.commit()
    conn.close()
    print("🧹 ¡Tabla 'encuestas' vaciada y reseteada con éxito!")

if __name__ == '__main__':
    resetear_tabla()