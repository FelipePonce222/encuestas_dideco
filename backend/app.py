from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import pandas as pd
import os
from IVPM_calculator import calcular_ivpm_registro
from database import get_connection, init_db

app = Flask(__name__)
CORS(app)

# Inicializar DB local al arrancar
DB_NAME = "dideco_encuestas.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
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
    conn.commit()
    conn.close()


init_db()
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    rut = data.get('rut')
    password = data.get('password')

    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM funcionario WHERE rut = ? AND password = ?", (rut, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            "status": "success",
            "message": "Bienvenido/a al sistema",
            "user": {
                "id": user["id_funcionario"],
                "rut": user["rut"],
                "nombre": user["nombre"],
                "cargo": user["cargo"]
            }
        }), 200
    else:
        return jsonify({"status": "error", "message": "RUT o contraseña incorrectos"}), 401


@app.route('/api/importar-excel', methods=['POST'])
def importar_excel():
    if 'file' not in request.files:
        return jsonify({"error": "No se subió ningún archivo"}), 400
    
    file = request.files['file']
    df = pd.read_excel(file)
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    registros_insertados = 0

    for _, row in df.iterrows():
        score, nivel, _ = calcular_ivpm_registro(row)
        
        cursor.execute('''
            INSERT INTO vecinos (rut, nombre, edad, direccion, unidad_vecinal, franja, hallazgo, ivpm_score, nivel_riesgo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(row.get('2) Rut de la persona mayor:', '')),
            str(row.get('1) Nombre Completo de la persona mayor:', '')),
            row.get('5) Edad:', None),
            str(row.get('1) Escribir dirección completa: ', '')),
            str(row.get('2) Seleccionar Número de Unidad Vecinal:', '')),
            "Franja 1",
            str(row.get('5) Hallazgo/Situación de la Persona Mayor:', '')),
            score,
            nivel
        ))
        registros_insertados += 1

    conn.commit()
    conn.close()

    return jsonify({
        "status": "ok",
        "mensaje": f"Se importaron {registros_insertados} registros exitosamente."
    })

@app.route('/api/vecino/<rut>', methods=['GET'])
def buscar_por_rut(rut):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM vecinos WHERE rut LIKE ?", (f"%{rut}%",))
    vecino = cursor.fetchone()
    conn.close()

    if vecino:
        return jsonify(dict(vecino))
    return jsonify({"error": "Vecino no encontrado"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)