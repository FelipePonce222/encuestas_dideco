import json  # <-- ASEGÚRATE DE TENER ESTO EN LA LÍNEA 1 O 2 DE APP.PY
from flask import Flask, request, jsonify, send_file
import io
from flask_cors import CORS
import sqlite3
import pandas as pd
import os
from IVPM_calculator import calcular_ivpm_registro

app = Flask(__name__)
CORS(app)

DB_NAME = "dideco_encuestas.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
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
            nivel_riesgo TEXT,
            datos_completos TEXT
        )
    ''')
    
    # Intentar agregar la columna si la tabla ya existía previamente
    try:
        cursor.execute('ALTER TABLE vecinos ADD COLUMN datos_completos TEXT')
    except sqlite3.OperationalError:
        pass # La columna ya existe

    conn.commit()
    conn.close()
    init_db()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    rut = data.get('rut')
    password = data.get('password')

    conn = get_db_connection()
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
    
    conn = get_db_connection()
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
def buscar_vecino(rut):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscamos al vecino por RUT
        cursor.execute("SELECT * FROM vecinos WHERE rut = ?", (rut,))
        vecino = cursor.fetchone()
        conn.close()

        if not vecino:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        # Convertimos la fila de la BD a diccionario
        vecino_dict = dict(vecino)

        # Si existen datos_completos en formato JSON, los parseamos
        if vecino_dict.get('datos_completos'):
            try:
                vecino_dict['encuesta_detalle'] = json.loads(vecino_dict['datos_completos'])
            except Exception as e:
                vecino_dict['encuesta_detalle'] = {}

        return jsonify(vecino_dict), 200

    except Exception as e:
        print(f"Error al buscar vecino: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/encuestas', methods=['POST', 'OPTIONS'])
def guardar_encuesta():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json or {}
        print("\n--- DATOS RECIBIDOS EN FLASK ---")
        print(data)

        # 1. Intentar calcular IVPM (si falla la función, no interrumpe el guardado)
        score = 0
        nivel = 'Sin evaluar'
        try:
            score, nivel, _ = calcular_ivpm_registro(data)
        except Exception as err_calc:
            print(f"⚠️ Aviso: No se pudo calcular IVPM en este registro: {err_calc}")

        # 2. Conectar a la BD
        conn = get_db_connection()
        cursor = conn.cursor()

        # ⚡ Asegurar que la columna 'datos_completos' exista en el archivo SQLite
        try:
            cursor.execute("ALTER TABLE vecinos ADD COLUMN datos_completos TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass

        # 3. Extraer datos principales
        rut = data.get('pm_rut') or 'SIN RUT'
        nombre = data.get('pm_nombre') or 'SIN NOMBRE'
        
        # Formatear edad de manera segura
        edad_val = data.get('edad')
        edad = int(edad_val) if edad_val and str(edad_val).isdigit() else None
        
        direccion = data.get('direccion') or ''
        villa = data.get('villa') or ''
        franja = data.get('franja') or 'Sin franja'
        hallazgo = data.get('hallazgo') or ''

        # 4. Convertir los 55 campos a JSON
        datos_json = json.dumps(data, ensure_ascii=False)

        # 5. Insertar en la BD
        cursor.execute('''
            INSERT INTO vecinos (
                rut, nombre, edad, direccion, unidad_vecinal, franja, hallazgo, ivpm_score, nivel_riesgo, datos_completos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (rut, nombre, edad, direccion, villa, franja, hallazgo, score, nivel, datos_json))

        conn.commit()
        conn.close()

        print(" SUCCESS: Registro guardado en BD con datos completos")
        return jsonify({
            'message': 'Encuesta guardada con éxito',
            'ivpm_score': score,
            'nivel_riesgo': nivel
        }), 201

    except Exception as e:
        print(f"\n ERROR EXACTO EN BACKEND: {e}\n")
        return jsonify({'error': str(e)}), 500

@app.route('/api/exportar-excel', methods=['GET'])
def exportar_excel():
    try:
        conn = get_db_connection()
        # Leemos toda la tabla vecinos directo a un DataFrame de Pandas
        df = pd.read_sql_query("SELECT * FROM vecinos", conn)
        conn.close()

        # Creamos un stream en memoria para no llenar el disco de archivos temporales
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Encuestas IVPM')
        
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='encuestas_ivpm_2026.xlsx'
        )

    except Exception as e:
        print(f"Error al exportar a Excel: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)