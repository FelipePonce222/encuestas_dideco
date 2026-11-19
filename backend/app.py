import io
import json
import os
import uuid

import pandas as pd
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS

from IVPM_calculator import calcular_ivpm_registro
from database import get_connection, init_db
from importador import importar_dataframe
from rut_utils import SIN_RUT, normalizar_rut, validar_rut
from fechas import ahora_iso
from auth import emitir_token, proteger_api, segundos_de_sesion
from perfil import perfil_bp
from seguridad import HASH_FALSO, verificar_password
from permisos import ROLES_VALIDOS, normalizar_rol, requiere_permiso
import usuarios as usuarios_srv

app = Flask(__name__)
CORS(app)
proteger_api(app)
app.register_blueprint(perfil_bp)

init_db()

# ---------------------------------------------------------------------------
# MÓDULO DE GESTIÓN DE INFORMES (.pdf y .docx)
# ---------------------------------------------------------------------------
UPLOADS_INFORMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads_informes")
EXTENSIONES_INFORME_PERMITIDAS = {".pdf", ".docx"}


def init_informes_db():
    os.makedirs(UPLOADS_INFORMES_DIR, exist_ok=True)
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS informes_documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            franja TEXT DEFAULT 'General',
            nombre_archivo_original TEXT NOT NULL,
            nombre_archivo_guardado TEXT NOT NULL,
            extension TEXT NOT NULL,
            tamano_bytes INTEGER DEFAULT 0,
            subido_por TEXT,
            fecha_subida TEXT
        )
    """)
    conn.commit()
    conn.close()


init_informes_db()


@app.route('/api/informes', methods=['GET'])
@requiere_permiso('informes_ver')
def listar_informes():
    try:
        conn = get_connection()
        filas = conn.execute(
            "SELECT * FROM informes_documentos ORDER BY id DESC"
        ).fetchall()
        conn.close()
        return jsonify([dict(f) for f in filas]), 200
    except Exception as e:
        print(f"❌ Error al listar informes: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/informes', methods=['POST'])
@requiere_permiso('informes_subir')
def subir_informe():
    if 'file' not in request.files:
        return jsonify({'error': 'Debes seleccionar un archivo .pdf o .docx.'}), 400

    archivo = request.files['file']
    if not archivo or not archivo.filename:
        return jsonify({'error': 'Nombre de archivo inválido.'}), 400

    nombre_original = archivo.filename.strip()
    _, ext = os.path.splitext(nombre_original)
    ext = ext.lower()

    if ext not in EXTENSIONES_INFORME_PERMITIDAS:
        return jsonify({'error': 'Formato no permitido. Solo se aceptan archivos .pdf y .docx.'}), 400

    titulo = (request.form.get('titulo') or '').strip() or os.path.splitext(nombre_original)[0]
    descripcion = (request.form.get('descripcion') or '').strip()
    franja = (request.form.get('franja') or 'General').strip()
    subido_por = (
        (getattr(g, 'funcionario', None) or {}).get('nombre')
        or (request.form.get('subido_por') or 'Funcionario DIDECO').strip()
    )

    nombre_guardado = f"{uuid.uuid4().hex}{ext}"
    ruta_destino = os.path.join(UPLOADS_INFORMES_DIR, nombre_guardado)

    try:
        os.makedirs(UPLOADS_INFORMES_DIR, exist_ok=True)
        archivo.save(ruta_destino)
        tamano = os.path.getsize(ruta_destino)
        fecha_subida = ahora_iso()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO informes_documentos (
                titulo, descripcion, franja, nombre_archivo_original,
                nombre_archivo_guardado, extension, tamano_bytes, subido_por, fecha_subida
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            titulo, descripcion, franja, nombre_original,
            nombre_guardado, ext.lstrip('.'), tamano, subido_por, fecha_subida
        ))
        nuevo_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Informe subido correctamente.',
            'id': nuevo_id
        }), 201
    except Exception as e:
        print(f"❌ Error al subir informe: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/informes/<int:informe_id>/descargar', methods=['GET'])
@requiere_permiso('informes_ver')
def descargar_informe(informe_id):
    try:
        conn = get_connection()
        doc = conn.execute(
            "SELECT * FROM informes_documentos WHERE id = ?", (informe_id,)
        ).fetchone()
        conn.close()

        if not doc:
            return jsonify({'error': 'Informe no encontrado.'}), 404

        ruta_archivo = os.path.join(UPLOADS_INFORMES_DIR, doc['nombre_archivo_guardado'])
        if not os.path.exists(ruta_archivo):
            return jsonify({'error': 'El archivo físico no existe en el servidor.'}), 404

        return send_file(
            ruta_archivo,
            as_attachment=True,
            download_name=doc['nombre_archivo_original']
        )
    except Exception as e:
        print(f"❌ Error al descargar informe: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/informes/<int:informe_id>', methods=['DELETE'])
@requiere_permiso('informes_eliminar')
def eliminar_informe(informe_id):
    try:
        conn = get_connection()
        doc = conn.execute(
            "SELECT * FROM informes_documentos WHERE id = ?", (informe_id,)
        ).fetchone()

        if not doc:
            conn.close()
            return jsonify({'error': 'Informe no encontrado.'}), 404

        ruta_archivo = os.path.join(UPLOADS_INFORMES_DIR, doc['nombre_archivo_guardado'])
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)

        conn.execute("DELETE FROM informes_documentos WHERE id = ?", (informe_id,))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Informe eliminado correctamente.'}), 200
    except Exception as e:
        print(f"❌ Error al eliminar informe: {e}")
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# AUTENTICACIÓN Y GESTIÓN DE USUARIOS
# ---------------------------------------------------------------------------
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    rut = normalizar_rut(data.get('rut') or '')
    password = (data.get('password') or '').strip()

    conn = get_connection()
    user = conn.execute("SELECT * FROM funcionario WHERE rut = ?", (rut,)).fetchone()
    conn.close()

    hash_guardado = user["password"] if user else HASH_FALSO
    clave_correcta = verificar_password(hash_guardado, password)

    if user and clave_correcta:
        user_dict = dict(user)
        rol_normalizado = normalizar_rol(user_dict.get("rol") or user_dict.get("cargo"))
        return jsonify({
            "status": "success",
            "message": "Bienvenido/a al sistema",
            "token": emitir_token(user),
            "expira_en": segundos_de_sesion(),
            "user": {
                "id": user_dict["id_funcionario"],
                "rut": user_dict["rut"],
                "nombre": user_dict["nombre"],
                "cargo": user_dict["cargo"],
                "rol": rol_normalizado
            }
        }), 200
    else:
        return jsonify({"status": "error", "message": "RUT o contraseña incorrectos"}), 401


@app.route('/api/usuarios', methods=['GET'])
@requiere_permiso('gestionar_usuarios')
def api_listar_usuarios():
    lista = usuarios_srv.listar()
    for u in lista:
        u['rol'] = normalizar_rol(u.get('rol') or u.get('cargo'))
    return jsonify({
        'usuarios': lista,
        'roles_disponibles': ROLES_VALIDOS
    }), 200


@app.route('/api/usuarios', methods=['POST'])
@requiere_permiso('gestionar_usuarios')
def api_guardar_usuario():
    data = request.json or {}
    rut = data.get('rut') or ''
    nombre = data.get('nombre') or ''
    rol = data.get('rol') or 'Encuestador / Digitador'
    cargo = data.get('cargo') or rol
    password = data.get('password') or ''

    try:
        resultado = usuarios_srv.crear_o_actualizar(
            rut=rut,
            nombre=nombre,
            cargo=cargo,
            rol=rol,
            password=password
        )
        return jsonify({
            'message': f'Usuario {resultado} correctamente con perfil {normalizar_rol(rol)}.',
            'estado': resultado
        }), 200
    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/usuarios/<rut>', methods=['DELETE'])
@requiere_permiso('gestionar_usuarios')
def api_eliminar_usuario(rut):
    rut_norm = normalizar_rut(rut)
    actual = getattr(g, 'funcionario', None) or {}
    if normalizar_rut(actual.get('rut') or '') == rut_norm:
        return jsonify({'error': 'No puedes eliminar tu propio usuario mientras tienes la sesión abierta.'}), 400

    if usuarios_srv.eliminar(rut_norm):
        return jsonify({'message': 'Usuario eliminado correctamente.'}), 200
    return jsonify({'error': 'Usuario no encontrado.'}), 404


# ---------------------------------------------------------------------------
# ENCUESTAS Y VECINOS (CRUD)
# ---------------------------------------------------------------------------
@app.route('/api/importar-excel', methods=['POST'])
@requiere_permiso('crear_encuesta')
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
@requiere_permiso('buscar_rut')
def buscar_vecino(rut):
    try:
        rut = normalizar_rut(rut)
        if not rut or rut == SIN_RUT:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vecinos WHERE rut = ? ORDER BY id DESC LIMIT 1", (rut,))
        vecino = cursor.fetchone()
        total = cursor.execute("SELECT COUNT(*) FROM vecinos WHERE rut = ?", (rut,)).fetchone()[0]
        conn.close()

        if not vecino:
            return jsonify({'message': 'Vecino no encontrado'}), 404

        vecino_dict = dict(vecino)
        vecino_dict['total_encuestas_rut'] = total

        if vecino_dict.get('datos_completos'):
            try:
                vecino_dict['encuesta_detalle'] = json.loads(vecino_dict['datos_completos'])
            except Exception:
                vecino_dict['encuesta_detalle'] = {}

        return jsonify(vecino_dict), 200

    except Exception as e:
        print(f"Error al buscar vecino: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/encuestas', methods=['POST', 'OPTIONS'])
@requiere_permiso('crear_encuesta')
def guardar_encuesta():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json or {}

        rut_ingresado = str(data.get('pm_rut') or '').strip()
        if not rut_ingresado or rut_ingresado.upper() == SIN_RUT:
            rut = SIN_RUT
        else:
            rut = normalizar_rut(rut_ingresado)
            if not validar_rut(rut):
                return jsonify({'error': 'RUT inválido: revisa el número y el dígito verificador.'}), 400
        data['pm_rut'] = rut

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

        data['fecha_registro'] = fecha_registro
        datos_json = json.dumps(data, ensure_ascii=False)

        cursor.execute('''
            INSERT INTO vecinos (
                rut, nombre, edad, direccion, unidad_vecinal, franja, hallazgo, ivpm_score, nivel_riesgo, datos_completos, fecha_registro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (rut, nombre, edad, direccion, villa, franja, hallazgo, score, nivel, datos_json, fecha_registro))

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Encuesta guardada con éxito',
            'ivpm_score': score,
            'nivel_riesgo': nivel,
            'fecha_registro': fecha_registro
        }), 201

    except Exception as e:
        print(f"\n ERROR EXACTO EN BACKEND: {e}\n")
        return jsonify({'error': str(e)}), 500


@app.route('/api/vecinos/<int:vecino_id>', methods=['PUT'])
@requiere_permiso('editar_encuesta')
def editar_encuesta(vecino_id):
    try:
        data = request.json or {}
        conn = get_connection()
        actual = conn.execute("SELECT * FROM vecinos WHERE id = ?", (vecino_id,)).fetchone()
        if not actual:
            conn.close()
            return jsonify({'error': 'Registro no encontrado.'}), 404

        rut_ingresado = str(data.get('rut') or data.get('pm_rut') or actual['rut']).strip()
        if not rut_ingresado or rut_ingresado.upper() == SIN_RUT:
            rut_final = SIN_RUT
        else:
            rut_final = normalizar_rut(rut_ingresado)
            if not validar_rut(rut_final):
                conn.close()
                return jsonify({'error': 'RUT inválido: revisa el número y el dígito verificador.'}), 400

        nombre = (data.get('nombre') or data.get('pm_nombre') or actual['nombre'] or '').strip()
        direccion = (data.get('direccion') if 'direccion' in data else actual['direccion'] or '').strip()
        villa = (data.get('unidad_vecinal') or data.get('villa') or actual['unidad_vecinal'] or '').strip()
        franja = (data.get('franja') or actual['franja'] or '').strip()
        hallazgo = (data.get('hallazgo') or actual['hallazgo'] or '').strip()

        edad_val = data.get('edad')
        if edad_val is not None and str(edad_val).strip() != '':
            edad = int(edad_val) if str(edad_val).strip().isdigit() else actual['edad']
        else:
            edad = actual['edad']

        try:
            detalle_previo = json.loads(actual['datos_completos']) if actual['datos_completos'] else {}
        except Exception:
            detalle_previo = {}
        if not isinstance(detalle_previo, dict):
            detalle_previo = {}

        detalle_previo.update(data)
        detalle_previo['pm_nombre'] = nombre
        detalle_previo['pm_rut'] = rut_final
        detalle_previo['direccion'] = direccion
        detalle_previo['villa'] = villa
        detalle_previo['franja'] = franja
        detalle_previo['hallazgo'] = hallazgo
        if edad is not None:
            detalle_previo['edad'] = edad

        score, nivel, _ = calcular_ivpm_registro(detalle_previo)
        datos_json = json.dumps(detalle_previo, ensure_ascii=False)

        conn.execute('''
            UPDATE vecinos
            SET rut = ?, nombre = ?, edad = ?, direccion = ?, unidad_vecinal = ?,
                franja = ?, hallazgo = ?, ivpm_score = ?, nivel_riesgo = ?, datos_completos = ?
            WHERE id = ?
        ''', (rut_final, nombre, edad, direccion, villa, franja, hallazgo, score, nivel, datos_json, vecino_id))
        conn.commit()

        actualizado = conn.execute("SELECT * FROM vecinos WHERE id = ?", (vecino_id,)).fetchone()
        conn.close()

        vecino_dict = dict(actualizado)
        vecino_dict['encuesta_detalle'] = detalle_previo

        return jsonify({
            'message': 'Encuesta actualizada correctamente.',
            'vecino': vecino_dict
        }), 200
    except Exception as e:
        print(f"❌ Error al editar encuesta: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/vecinos/<int:vecino_id>', methods=['DELETE'])
@requiere_permiso('eliminar_encuesta')
def eliminar_encuesta(vecino_id):
    try:
        conn = get_connection()
        cursor = conn.execute("DELETE FROM vecinos WHERE id = ?", (vecino_id,))
        conn.commit()
        conn.close()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Registro no encontrado.'}), 404
        return jsonify({'message': 'Encuesta eliminada correctamente.'}), 200
    except Exception as e:
        print(f"❌ Error al eliminar encuesta: {e}")
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# DASHBOARD, REPORTES EXCEL, LISTADOS Y GRÁFICOS
# ---------------------------------------------------------------------------
@app.route('/api/dashboard/stats', methods=['GET'])
@requiere_permiso('ver_dashboard')
def obtener_dashboard_stats():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM vecinos")
        total_encuestas = cursor.fetchone()[0]

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
@requiere_permiso('exportar_excel')
def exportar_excel():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM vecinos")
        filas = cursor.fetchall()
        conn.close()

        if not filas:
            return jsonify({'error': 'No hay datos registrados para exportar'}), 404

        registros_procesados = []
        for fila in filas:
            item = dict(fila)
            datos_json_str = item.pop('datos_completos', '{}')
            try:
                datos_preguntas = json.loads(datos_json_str) if datos_json_str else {}
            except Exception:
                datos_preguntas = {}

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

            if isinstance(datos_preguntas, dict):
                for clave_pregunta, valor_respuesta in datos_preguntas.items():
                    encabezado_columna = clave_pregunta.replace('_', ' ').capitalize()
                    registro_limpio[encabezado_columna] = valor_respuesta

            registros_procesados.append(registro_limpio)

        df = pd.DataFrame(registros_procesados)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Encuestas DIDECO 2026')
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Reporte_Encuestas_PM_2026.xlsx'
        )

    except Exception as e:
        print(f"❌ Error al desplegar preguntas en Excel: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/encuestas/recientes', methods=['GET'])
@requiere_permiso('buscar_rut')
def obtener_encuestas_recientes():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, rut, nombre, direccion, nivel_riesgo, hallazgo, fecha_registro 
            FROM vecinos 
            ORDER BY datetime(fecha_registro) DESC 
            LIMIT 10
        """)
        filas = cursor.fetchall()
        conn.close()
        return jsonify([dict(fila) for fila in filas]), 200
    except Exception as e:
        print(f"❌ Error al obtener encuestas recientes: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/vecinos/riesgo/<categoria>', methods=['GET'])
@requiere_permiso('buscar_rut')
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
@requiere_permiso('buscar_rut')
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


@app.route('/api/graficos', methods=['GET'])
@requiere_permiso('ver_dashboard')
def obtener_datos_graficos():
    try:
        franja_filtro = (request.args.get('franja') or 'Total').strip()

        conn = get_connection()
        if franja_filtro and franja_filtro.lower() != 'total':
            filas = conn.execute(
                "SELECT * FROM vecinos WHERE LOWER(TRIM(franja)) = LOWER(TRIM(?))",
                (franja_filtro,)
            ).fetchall()
        else:
            filas = conn.execute("SELECT * FROM vecinos").fetchall()
        conn.close()

        def buscar_campo(det_lower, exactas, parciales=None):
            for k in exactas:
                kl = k.lower()
                if kl in det_lower and det_lower[kl] is not None and str(det_lower[kl]).strip() != '':
                    return det_lower[kl]
            if parciales:
                for p in parciales:
                    pl = p.lower()
                    for rk, rv in det_lower.items():
                        if pl in rk and rv is not None and str(rv).strip() != '':
                            return rv
            return None

        def es_concretada(hallazgo_txt, nivel_riesgo):
            h = (hallazgo_txt or '').lower()
            if 'acepta participar' in h or 'oficina dideco' in h:
                return True
            no_conc = [
                'no se encuentra', 'no hay moradores', 'fallecida',
                'no desea', 'no acepta', 'ya no reside', 'difícil acceso',
                'dificil acceso', 'no vive ninguna'
            ]
            if any(x in h for x in no_conc):
                return False
            return (nivel_riesgo or '') not in ['', 'Sin evaluar', 'No Aplica / Sin Contacto']

        total_visitadas = len(filas)
        concretadas = 0
        no_concretadas = 0

        c_situacion = {}
        c_genero = {'Femenino': 0, 'Masculino': 0}
        c_edad = {'60 a 64 años': 0, '65 a 74 años': 0, '75 a 79 años': 0, '80 años y más': 0}
        c_patologia = {'Sí': 0, 'No': 0}
        c_discapacidad = {'Sí': 0, 'No': 0}
        c_tipo_disc = {
            'Física': 0,
            'Sensorial (auditiva/visual)': 0,
            'Múltiple': 0,
            'Psíquica/Mental': 0,
            'Intelectual': 0
        }
        c_laboral = {'Sí': 0, 'No': 0, 'Sin información': 0}
        c_pension = {'Sí': 0, 'No': 0, 'Sin información': 0}
        c_visitas = {
            'Ocasionalmente': 0,
            'Diario': 0,
            'Varias veces por semana': 0,
            'Una vez por semana': 0,
            'Nunca': 0,
            'Sin información': 0
        }
        c_programa = {'Sí': 0, 'No': 0, 'Sin información': 0}
        c_viv_situacion = {
            'Propietario(a)': 0,
            'Allegado(a)': 0,
            'Herencia': 0,
            'Arrendatario(a)': 0,
            'Usufructo': 0,
            'Copropiedad': 0,
            'Cedida': 0,
            'Propietario(a) con deuda': 0,
            'No sabe / No responde': 0
        }
        c_viv_estado = {
            'Bueno': 0,
            'Regular': 0,
            'Malo': 0,
            'Muy malo': 0,
            'No sabe / No responde': 0
        }
        c_viv_electrica = {
            'Menos de 1 año': 0,
            'Entre 1 y 5 años': 0,
            'Más de 5 años': 0,
            'Nunca': 0,
            'No sabe / No recuerda': 0
        }
        c_viv_material = {
            'Sólido': 0,
            'Madera': 0,
            'Mixto': 0,
            'No sabe / No recuerda': 0
        }

        for fila in filas:
            item = dict(fila)
            try:
                det = json.loads(item.get('datos_completos') or '{}')
            except Exception:
                det = {}
            if not isinstance(det, dict):
                det = {}

            det_lower = {str(k).strip().lower(): v for k, v in det.items()}

            hallazgo_raw = item.get('hallazgo') or buscar_campo(
                det_lower, ['hallazgo'], ['hallazgo', 'situación de la persona mayor', 'situacion de la persona mayor']
            ) or 'Sin información'
            hallazgo_str = str(hallazgo_raw).strip()
            c_situacion[hallazgo_str] = c_situacion.get(hallazgo_str, 0) + 1

            if not es_concretada(hallazgo_str, item.get('nivel_riesgo')):
                no_concretadas += 1
                continue

            concretadas += 1

            gen = str(buscar_campo(det_lower, ['genero', 'sexo', 'género'], ['género', 'genero', 'sexo']) or '').strip().lower()
            if gen.startswith('f') or 'mujer' in gen:
                c_genero['Femenino'] += 1
            elif gen.startswith('m') or 'hombre' in gen:
                c_genero['Masculino'] += 1
            elif gen:
                c_genero[gen.capitalize()] = c_genero.get(gen.capitalize(), 0) + 1

            edad_val = item.get('edad') or buscar_campo(det_lower, ['edad'], ['edad'])
            try:
                edad_num = int(float(str(edad_val).strip()))
                if 60 <= edad_num <= 64:
                    c_edad['60 a 64 años'] += 1
                elif 65 <= edad_num <= 74:
                    c_edad['65 a 74 años'] += 1
                elif 75 <= edad_num <= 79:
                    c_edad['75 a 79 años'] += 1
                elif edad_num >= 80:
                    c_edad['80 años y más'] += 1
            except Exception:
                pass

            pat = str(buscar_campo(det_lower, ['presenta_patologia', 'tiene_patologia'], ['patología de salud', 'patologia de salud']) or '').strip().lower()
            if pat.startswith('sí') or pat.startswith('si'):
                c_patologia['Sí'] += 1
            elif pat == 'no' or 'ninguna' in pat:
                c_patologia['No'] += 1

            disc = str(buscar_campo(det_lower, ['discapacidad_aplica', 'presenta_discapacidad'], ['alguna discapacidad', 'presenta discapacidad']) or '').strip().lower()
            if disc.startswith('sí') or disc.startswith('si'):
                c_discapacidad['Sí'] += 1
                t_disc = str(buscar_campo(det_lower, ['discapacidad_tipo', 'tipo_discapacidad'], ['tipo de discapacidad']) or '').strip().lower()
                if 'físic' in t_disc or 'fisic' in t_disc:
                    c_tipo_disc['Física'] += 1
                elif 'sensorial' in t_disc or 'auditiv' in t_disc or 'visual' in t_disc:
                    c_tipo_disc['Sensorial (auditiva/visual)'] += 1
                elif 'múltiple' in t_disc or 'multiple' in t_disc:
                    c_tipo_disc['Múltiple'] += 1
                elif 'psíquic' in t_disc or 'psiquic' in t_disc or 'mental' in t_disc:
                    c_tipo_disc['Psíquica/Mental'] += 1
                elif 'intelectual' in t_disc:
                    c_tipo_disc['Intelectual'] += 1
            elif disc == 'no':
                c_discapacidad['No'] += 1

            lab = str(buscar_campo(det_lower, ['actividad_laboral', 'trabaja', 'emprendimiento'], ['actividad laboral', 'emprendimiento']) or '').strip().lower()
            if lab.startswith('sí') or lab.startswith('si'):
                c_laboral['Sí'] += 1
            elif lab == 'no':
                c_laboral['No'] += 1
            else:
                c_laboral['Sin información'] += 1

            pen = str(buscar_campo(det_lower, ['pension', 'recibe_pension', 'pensión'], ['pensión', 'pension']) or '').strip().lower()
            if pen.startswith('sí') or pen.startswith('si'):
                c_pension['Sí'] += 1
            elif pen == 'no':
                c_pension['No'] += 1
            else:
                c_pension['Sin información'] += 1

            vis = str(buscar_campo(det_lower, ['frecuencia_visitas'], ['frecuencia de visitas', 'contacto con familiares', 'contacto de familiares']) or '').strip().lower()
            if 'ocasional' in vis:
                c_visitas['Ocasionalmente'] += 1
            elif 'diario' in vis:
                c_visitas['Diario'] += 1
            elif 'varias veces' in vis:
                c_visitas['Varias veces por semana'] += 1
            elif 'una vez' in vis or '1 vez' in vis:
                c_visitas['Una vez por semana'] += 1
            elif 'nunca' in vis:
                c_visitas['Nunca'] += 1
            else:
                c_visitas['Sin información'] += 1

            prog = str(buscar_campo(det_lower, ['programa_social'], ['programa social o municipal']) or '').strip().lower()
            if prog.startswith('sí') or prog.startswith('si'):
                c_programa['Sí'] += 1
            elif prog == 'no':
                c_programa['No'] += 1
            else:
                c_programa['Sin información'] += 1

            sviv = str(buscar_campo(det_lower, ['situacion_habitacional', 'situacion_vivienda'], ['situación habitacional', 'situacion habitacional', 'situación de la vivienda']) or '').strip().lower()
            if 'deuda' in sviv:
                c_viv_situacion['Propietario(a) con deuda'] += 1
            elif 'propietario' in sviv:
                c_viv_situacion['Propietario(a)'] += 1
            elif 'allegado' in sviv:
                c_viv_situacion['Allegado(a)'] += 1
            elif 'herencia' in sviv:
                c_viv_situacion['Herencia'] += 1
            elif 'arrendatario' in sviv:
                c_viv_situacion['Arrendatario(a)'] += 1
            elif 'usufructo' in sviv:
                c_viv_situacion['Usufructo'] += 1
            elif 'copropiedad' in sviv:
                c_viv_situacion['Copropiedad'] += 1
            elif 'cedida' in sviv:
                c_viv_situacion['Cedida'] += 1
            elif sviv:
                c_viv_situacion['No sabe / No responde'] += 1

            eviv = str(buscar_campo(det_lower, ['estado_vivienda'], ['estado general de su vivienda', 'estado general de la vivienda']) or '').strip().lower()
            if 'muy malo' in eviv:
                c_viv_estado['Muy malo'] += 1
            elif 'malo' in eviv:
                c_viv_estado['Malo'] += 1
            elif 'regular' in eviv:
                c_viv_estado['Regular'] += 1
            elif 'bueno' in eviv:
                c_viv_estado['Bueno'] += 1
            elif eviv:
                c_viv_estado['No sabe / No responde'] += 1

            elec = str(buscar_campo(det_lower, ['revision_electrica'], ['sistema eléctrico', 'sistema electrico']) or '').strip().lower()
            if 'menos de 1' in elec:
                c_viv_electrica['Menos de 1 año'] += 1
            elif 'entre 1 y 5' in elec or '1 y 5' in elec:
                c_viv_electrica['Entre 1 y 5 años'] += 1
            elif 'más de 5' in elec or 'mas de 5' in elec:
                c_viv_electrica['Más de 5 años'] += 1
            elif 'nunca' in elec:
                c_viv_electrica['Nunca'] += 1
            elif elec:
                c_viv_electrica['No sabe / No recuerda'] += 1

            mat = str(buscar_campo(det_lower, ['material_predominante'], ['material predominante']) or '').strip().lower()
            if 'sólido' in mat or 'solido' in mat:
                c_viv_material['Sólido'] += 1
            elif 'madera' in mat:
                c_viv_material['Madera'] += 1
            elif 'mixto' in mat:
                c_viv_material['Mixto'] += 1
            elif mat:
                c_viv_material['No sabe / No recuerda'] += 1

        def empacar(diccionario, ordenar_desc=False):
            items = list(diccionario.items())
            if ordenar_desc:
                items.sort(key=lambda x: x[1], reverse=True)
            total_n = sum(v for _, v in items)
            labels = [k for k, _ in items]
            valores = [v for _, v in items]
            porcentajes = [round((v / total_n) * 100, 1) if total_n > 0 else 0 for v in valores]
            return {
                'n': total_n,
                'labels': labels,
                'valores': valores,
                'porcentajes': porcentajes
            }

        return jsonify({
            'franja': franja_filtro,
            'resumen': {
                'total_visitadas': total_visitadas,
                'concretadas': concretadas,
                'no_concretadas': no_concretadas,
                'pct_concretadas': round((concretadas / total_visitadas) * 100, 1) if total_visitadas > 0 else 0,
                'pct_no_concretadas': round((no_concretadas / total_visitadas) * 100, 1) if total_visitadas > 0 else 0,
            },
            'cobertura': empacar({
                'Encuestas Concretadas': concretadas,
                'No Concretadas (Sin contacto / Rechazo / Otros)': no_concretadas
            }),
            'situacion_pm': empacar(c_situacion, ordenar_desc=True),
            'genero': empacar(c_genero),
            'edad': empacar(c_edad),
            'patologia': empacar(c_patologia),
            'discapacidad': empacar(c_discapacidad),
            'tipo_discapacidad': empacar(c_tipo_disc, ordenar_desc=True),
            'actividad_laboral': empacar(c_laboral),
            'pension': empacar(c_pension),
            'frecuencia_visitas': empacar(c_visitas, ordenar_desc=True),
            'programa_social': empacar(c_programa),
            'situacion_vivienda': empacar(c_viv_situacion, ordenar_desc=True),
            'estado_vivienda': empacar(c_viv_estado),
            'revision_electrica': empacar(c_viv_electrica),
            'material_vivienda': empacar(c_viv_material),
        }), 200

    except Exception as e:
        print(f"❌ Error al generar datos de gráficos: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)