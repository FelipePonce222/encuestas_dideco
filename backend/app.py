import json
from flask import Flask, request, jsonify, send_file
import io
from flask_cors import CORS
import sqlite3
import pandas as pd
import os
from IVPM_calculator import calcular_ivpm_registro
from database import get_connection as get_db_connection, init_db
from datetime import datetime


app = Flask(__name__)
CORS(app)

# 🚀 Inicializar base de datos y tablas de funcionarios/vecinos
DB_NAME = "dideco_encuestas.db"
init_db()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    rut = data.get('rut', '').strip()
    password = data.get('password', '').strip()

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
        
        cursor.execute("SELECT * FROM vecinos WHERE rut = ?", (rut,))
        vecino = cursor.fetchone()
        conn.close()

        if not vecino:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        vecino_dict = dict(vecino)

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

        # Generar timestamp local si no viene en los datos
        fecha_registro = data.get('fecha_registro') or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        score = 0
        nivel = 'Sin evaluar'
        try:
            score, nivel, _ = calcular_ivpm_registro(data)
        except Exception as err_calc:
            print(f"⚠️ Aviso: No se pudo calcular IVPM en este registro: {err_calc}")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Asegurar columnas necesarias
        try:
            cursor.execute("ALTER TABLE vecinos ADD COLUMN datos_completos TEXT")
        except sqlite3.OperationalError:
            pass
            
        try:
            cursor.execute("ALTER TABLE vecinos ADD COLUMN fecha_registro DATETIME")
        except sqlite3.OperationalError:
            pass

        rut = data.get('pm_rut') or 'SIN RUT'
        nombre = data.get('pm_nombre') or 'SIN NOMBRE'
        
        edad_val = data.get('edad')
        edad = int(edad_val) if edad_val and str(edad_val).isdigit() else None
        
        direccion = data.get('direccion') or ''
        villa = data.get('villa') or ''
        franja = data.get('franja') or 'Sin franja'
        hallazgo = data.get('hallazgo') or ''

        # Añadimos la fecha_registro también dentro del JSON completo por respaldo
        data['fecha_registro'] = fecha_registro
        datos_json = json.dumps(data, ensure_ascii=False)

        cursor.execute('''
            INSERT INTO vecinos (
                rut, nombre, edad, direccion, unidad_vecinal, franja, hallazgo, ivpm_score, nivel_riesgo, datos_completos, fecha_registro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (rut, nombre, edad, direccion, villa, franja, hallazgo, score, nivel, datos_json, fecha_registro))

        conn.commit()
        conn.close()

        print(f" SUCCESS: Encuesta guardada exitosamente con fecha: {fecha_registro}")
        return jsonify({
            'message': 'Encuesta guardada con éxito',
            'ivpm_score': score,
            'nivel_riesgo': nivel,
            'fecha_registro': fecha_registro
        }), 201

    except Exception as e:
        print(f"\n ERROR EXACTO EN BACKEND: {e}\n")
        return jsonify({'error': str(e)}), 500

@app.route('/api/exportar-excel', methods=['GET'])
def exportar_excel():
    try:
        conn = get_db_connection()
        df = pd.read_sql_query("SELECT * FROM vecinos", conn)
        conn.close()

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


@app.route('/api/dashboard/stats', methods=['GET'])
def obtener_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Total encuestas realizadas
        cursor.execute("SELECT COUNT(*) FROM vecinos")
        total_encuestas = cursor.fetchone()[0]

        # 2. Conteo por Nivel de Riesgo IVPM
        cursor.execute("""
            SELECT nivel_riesgo, COUNT(*) as cantidad 
            FROM vecinos 
            GROUP BY nivel_riesgo
        """)
        filas_riesgo = cursor.fetchall()
        
        niveles_riesgo = {
            'Vulnerabilidad Crítica': 0,
            'Vulnerabilidad Alta': 0,
            'Vulnerabilidad Moderada': 0,
            'Vulnerabilidad Baja': 0,
            'Sin evaluar': 0
        }
        for fila in filas_riesgo:
            key = fila['nivel_riesgo'] if fila['nivel_riesgo'] else 'Sin evaluar'
            niveles_riesgo[key] = fila['cantidad']

        # 3. Conteo por Hallazgo / Estado de visita
        cursor.execute("""
            SELECT hallazgo, COUNT(*) as cantidad 
            FROM vecinos 
            GROUP BY hallazgo
        """)
        filas_hallazgo = cursor.fetchall()
        hallazgos = {}
        for fila in filas_hallazgo:
            key = fila['hallazgo'] if fila['hallazgo'] else 'No especificado'
            hallazgos[key] = fila['cantidad']

        conn.close()

        return jsonify({
            'total_encuestas': total_encuestas,
            'niveles_riesgo': niveles_riesgo,
            'hallazgos': hallazgos
        }), 200

    except Exception as e:
        print(f"❌ Error al consultar estadísticas del dashboard: {e}")
        return jsonify({'error': str(e)}), 500

# ⚡ El servidor SIEMPRE debe arrancarse al final de todo el archivo
if __name__ == '__main__':
    app.run(debug=True, port=5000)