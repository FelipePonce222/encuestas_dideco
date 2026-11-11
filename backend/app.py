import io
import json
from datetime import datetime

import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from IVPM_calculator import calcular_ivpm_registro
from database import get_connection, init_db   # ← ÚNICA fuente de la base de datos
from importador import importar_dataframe
from rut_utils import SIN_RUT, normalizar_rut, validar_rut

app = Flask(__name__)
CORS(app)

# Crea las tablas (funcionario / vecinos) en la base única si no existen
init_db()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    rut = normalizar_rut(data.get('rut') or '')   # acepta 12.345.678-5, 123456785, etc.
    password = (data.get('password') or '').strip()

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

    try:
        df = pd.read_excel(request.files['file'])
    except Exception as e:
        print(f"Error al leer el Excel: {e}")
        return jsonify({"error": "No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) válido."}), 400

    franja = request.form.get('franja') or 'Franja 1'
    r = importar_dataframe(df, franja=franja)

    mensaje = f"Se importaron {r['insertados']} registros exitosamente."
    if r['duplicados']:
        mensaje += f" ({r['duplicados']} duplicados omitidos)"

    return jsonify({"status": "ok", "mensaje": mensaje, **r})

@app.route('/api/vecino/<rut>', methods=['GET'])
def buscar_vecino(rut):
    try:
        rut = normalizar_rut(rut)   # 12.345.678-5 / 12345678-k -> formato único del sistema

        conn = get_connection()
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

        # RUT: opcional, pero si viene debe ser válido. Se guarda en formato único.
        rut_ingresado = str(data.get('pm_rut') or '').strip()
        if not rut_ingresado or rut_ingresado.upper() == SIN_RUT:
            rut = SIN_RUT
        else:
            rut = normalizar_rut(rut_ingresado)
            if not validar_rut(rut):
                return jsonify({'error': 'RUT inválido: revisa el número y el dígito verificador.'}), 400
        data['pm_rut'] = rut   # el JSON de respaldo también queda normalizado

        # Generar timestamp local si no viene en los datos
        fecha_registro = data.get('fecha_registro') or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        score = 0
        nivel = 'Sin evaluar'
        try:
            score, nivel, _ = calcular_ivpm_registro(data)
        except Exception as err_calc:
            print(f"⚠️ Aviso: No se pudo calcular IVPM en este registro: {err_calc}")

        conn = get_connection()
        cursor = conn.cursor()

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


@app.route('/api/dashboard/stats', methods=['GET'])
def obtener_dashboard_stats():
    try:
        conn = get_connection()
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

@app.route('/api/reports/excel', methods=['GET'])
def exportar_excel():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Consultamos todos los registros
        cursor.execute("SELECT * FROM vecinos")
        filas = cursor.fetchall()
        conn.close()

        if not filas:
            return jsonify({'error': 'No hay datos registrados para exportar'}), 404

        # 2. Desenrollamos los datos JSON en diccionarios independientes
        registros_procesados = []
        for fila in filas:
            # Convertimos la fila de la base de datos a un diccionario
            item = dict(fila)
            
            # Extraemos y parseamos la columna JSON datos_completos
            datos_json_str = item.pop('datos_completos', '{}')
            try:
                datos_preguntas = json.loads(datos_json_str) if datos_json_str else {}
            except Exception:
                datos_preguntas = {}

            # Fusionamos los datos generales de la tabla con cada pregunta individual
            # Las columnas principales (RUT, Nombre, Nivel Riesgo, Fecha) van primero
            registro_limpio = {
                'ID': item.get('id'),
                'RUT Vecino': item.get('rut'),
                'Nombre Completo': item.get('nombre'),
                'Dirección': item.get('direccion'),
                'Nivel Riesgo IVPM': item.get('nivel_riesgo'),
                'Estado Visita / Hallazgo': item.get('hallazgo'),
                'Fecha Registro': item.get('fecha_registro'),
                'Encuestador': item.get('funcionario_rut')
            }

            # Agregamos cada una de las 54 preguntas como columnas propias
            if isinstance(datos_preguntas, dict):
                for clave_pregunta, valor_respuesta in datos_preguntas.items():
                    # Formateamos las llaves del JSON para que se lean bonitas como encabezado
                    encabezado_columna = clave_pregunta.replace('_', ' ').capitalize()
                    registro_limpio[encabezado_columna] = valor_respuesta

            registros_procesados.append(registro_limpio)

        # 3. Convertimos la lista de registros a un DataFrame de Pandas
        df = pd.DataFrame(registros_procesados)

        # 4. Generamos el Excel en memoria con formato limpio
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Encuestas DIDECO 2026')
        
        output.seek(0)

        # 5. Retornamos el archivo .xlsx
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Reporte_Encuestas_PM_2026.xlsx'
        )

    except Exception as e:
        print(f"❌ Error al desplegar preguntas en Excel: {e}")
        return jsonify({'error': str(e)}), 500

    
# BusquedaRut.jsx: Endpoint para obtener las últimas 10 encuestas recientes --------------------------------------------------------------------------------------------------------------
@app.route('/api/encuestas/recientes', methods=['GET'])
def obtener_encuestas_recientes():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Obtenemos las últimas 10 encuestas ordenadas por fecha descendente
        cursor.execute("""
            SELECT id, rut, nombre, direccion, nivel_riesgo, hallazgo, fecha_registro 
            FROM vecinos 
            ORDER BY datetime(fecha_registro) DESC 
            LIMIT 10
        """)
        filas = cursor.fetchall()
        conn.close()

        recientes = [dict(fila) for fila in filas]

        return jsonify(recientes), 200

    except Exception as e:
        print(f"❌ Error al obtener encuestas recientes: {e}")
        return jsonify({'error': str(e)}), 500

# ⚡ El servidor SIEMPRE debe arrancarse al final de todo el archivo
if __name__ == '__main__':
    app.run(debug=True, port=5000)