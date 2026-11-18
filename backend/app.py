import io
import json

import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from IVPM_calculator import calcular_ivpm_registro
from database import get_connection, init_db   # ← ÚNICA fuente de la base de datos
from importador import importar_dataframe
from rut_utils import SIN_RUT, normalizar_rut, validar_rut
from fechas import ahora_iso
from auth import emitir_token, proteger_api, segundos_de_sesion
from perfil import perfil_bp
from seguridad import HASH_FALSO, verificar_password

app = Flask(__name__)
CORS(app)
proteger_api(app)   # TODAS las rutas /api/ exigen sesión (token), salvo /api/login
app.register_blueprint(perfil_bp)   # Mi Perfil (también protegido por el token)

# Crea las tablas (funcionario / vecinos) en la base única si no existen
init_db()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    rut = normalizar_rut(data.get('rut') or '')   # acepta 12.345.678-5, 123456785, etc.
    password = (data.get('password') or '').strip()

    conn = get_connection()
    user = conn.execute("SELECT * FROM funcionario WHERE rut = ?", (rut,)).fetchone()
    conn.close()

    # Siempre se verifica un hash (aunque el RUT no exista) para que el tiempo de respuesta
    # no revele qué RUT están registrados. Las contraseñas se guardan con hash, nunca en texto plano.
    hash_guardado = user["password"] if user else HASH_FALSO
    clave_correcta = verificar_password(hash_guardado, password)

    if user and clave_correcta:
        return jsonify({
            "status": "success",
            "message": "Bienvenido/a al sistema",
            "token": emitir_token(user),           # el front lo envía en cada petición
            "expira_en": segundos_de_sesion(),     # segundos de duración de la sesión
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

        # 'SIN RUT' lo comparten muchas personas: no se puede buscar por ese valor
        if not rut or rut == SIN_RUT:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        conn = get_connection()
        cursor = conn.cursor()

        # Si el mismo RUT tiene varias encuestas, se entrega la ÚLTIMA registrada en el sistema
        # (id más alto). Ordenar por id es más confiable que por fecha_registro, que en datos
        # antiguos viene en formatos distintos.
        cursor.execute("SELECT * FROM vecinos WHERE rut = ? ORDER BY id DESC LIMIT 1", (rut,))
        vecino = cursor.fetchone()
        total = cursor.execute("SELECT COUNT(*) FROM vecinos WHERE rut = ?", (rut,)).fetchone()[0]
        conn.close()

        if not vecino:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        vecino_dict = dict(vecino)
        vecino_dict['total_encuestas_rut'] = total   # cuántas encuestas tiene este RUT en total

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

        # La fecha la pone SIEMPRE el servidor (hora de Chile, formato ISO). Se ignora la que
        # venga del navegador: el reloj de cada equipo puede estar mal y su formato no ordena.
        fecha_registro = ahora_iso()

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




@app.route('/api/vecinos/riesgo/<categoria>', methods=['GET'])
def obtener_vecinos_por_riesgo(categoria):
    try:
        filtros = {
            'prioritarios': ("('Vulnerabilidad Crítica', 'Vulnerabilidad Alta')", "DESC"),
            'moderada': ("('Vulnerabilidad Moderada')", "DESC"),
            'baja': ("('Vulnerabilidad Baja')", "DESC"),
        }

        if categoria not in filtros:
            return jsonify({'error': 'Categoría de riesgo no válida'}), 400

        clausula_in, orden_ivpm = filtros[categoria]

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(f"""
            SELECT id, rut, nombre, edad, direccion, unidad_vecinal, franja,
                   hallazgo, ivpm_score, nivel_riesgo, fecha_registro
            FROM vecinos
            WHERE nivel_riesgo IN {clausula_in}
            ORDER BY
                CASE nivel_riesgo
                    WHEN 'Vulnerabilidad Crítica' THEN 1
                    WHEN 'Vulnerabilidad Alta' THEN 2
                    WHEN 'Vulnerabilidad Moderada' THEN 3
                    WHEN 'Vulnerabilidad Baja' THEN 4
                    ELSE 5
                END,
                ivpm_score {orden_ivpm},
                nombre ASC
        """)
        filas = cursor.fetchall()
        conn.close()

        return jsonify([dict(fila) for fila in filas]), 200

    except Exception as e:
        print(f"❌ Error al obtener vecinos por riesgo ({categoria}): {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/vecino/id/<int:vecino_id>', methods=['GET'])
def obtener_vecino_por_id(vecino_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vecinos WHERE id = ?", (vecino_id,))
        vecino = cursor.fetchone()
        conn.close()

        if not vecino:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        vecino_dict = dict(vecino)
        if vecino_dict.get('datos_completos'):
            try:
                vecino_dict['encuesta_detalle'] = json.loads(vecino_dict['datos_completos'])
            except Exception:
                vecino_dict['encuesta_detalle'] = {}
        else:
            vecino_dict['encuesta_detalle'] = {}

        return jsonify(vecino_dict), 200

    except Exception as e:
        print(f"Error al obtener vecino por ID: {e}")
        return jsonify({'error': str(e)}), 500

# ⚡ El servidor SIEMPRE debe arrancarse al final de todo el archivo
if __name__ == '__main__':
    app.run(debug=True, port=5000)