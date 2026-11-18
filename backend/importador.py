import os
import json
import glob
import pandas as pd

from database import get_connection, init_db
from IVPM_calculator import calcular_ivpm_registro
from rut_utils import SIN_RUT, normalizar_rut
from fechas import ahora_iso

# Mapeo por prefijo de pregunta del Excel -> clave exacta que espera el Frontend (NuevaEncuesta / BusquedaRut)
MAPEO_PREFIJOS = [
    ("1) Nombre y Apellido del Encuestador", "encuestador_nombre"),
    ("2) Unidad o departamento", "encuestador_depto"),
    ("1) Escribir dirección completa", "direccion"),
    ("2) Seleccionar Número de Unidad Vecinal", "unidad_vecinal"),
    ("3) Seleccionar Villa o Población", "villa"),
    ("4) Información complementaria de la ubicación", "info_ubicacion"),
    ("5) Hallazgo/Situación de la Persona Mayor", "hallazgo"),
    ("1) Nombre completo del cuidador", "cuidador_nombre"),
    ("2) Teléfono del cuidador", "cuidador_telefono"),
    ("3) Vínculo o relación con la persona mayor", "cuidador_vinculo"),
    ("1) Nombre Completo de la persona mayor", "pm_nombre"),
    ("2) Rut de la persona mayor", "pm_rut"),
    ("3) Número de teléfono de la persona mayor", "pm_telefono"),
    ("4) Número de Emergencia", "contacto_emergencia"),
    ("5) Edad", "edad"),
    ("6) Género", "genero"),
    ("7) Nacionalidad", "nacionalidad"),
    ("8) ¿Pertenece a alguna etnia", "pueblo_originario_aplica"),
    ("9) Etnia a la que pertenece", "pueblo_originario"),
    ("10) Tramo del RSH", "tramo_rsh"),
    ("11) ¿Usted se atiende en algún Centro de Salud", "salud_centro_aplica"),
    ("12) ¿En qué centro de salud", "salud_centro_nombre"),
    ("13) Comuna del Centro de Salud", "salud_centro_comuna"),
    ("14) ¿Presenta alguna patología", "presenta_patologia"),
    ("15) ¿Cuál(es) de las siguientes patologías", "patologias"),
    ("16) ¿Actualmente está tratando", "patologias_tratamiento"),
    ("17) Se encuentra vacunado", "vacunas"),
    ("18) ¿Presenta alguna Discapacidad", "discapacidad_aplica"),
    ("19) ¿Tipo de Discapacidad", "discapacidad_tipo"),
    ("20) ¿Tiene su credencial de Discapacidad", "discapacidad_credencial"),
    ("21) ¿Cuál es su porcentaje de discapacidad", "discapacidad_porcentaje"),
    ("22) Utiliza o requiere de Ayuda Técnica", "ayuda_tecnica_aplica"),
    ("23) ¿Cuál?", "ayuda_tecnica_detalle"),
    ("24) Indique la cantidad de personas", "convivientes_cantidad"),
    ("25) ¿Con quién(es) vive actualmente", "convive_con"),
    ("26) En su hogar, ¿vive otra persona mayor", "vive_otra_pm"),
    ("27) ¿Qué relación/vínculo tiene con usted", "vive_otra_pm_vinculo"),
    ("28) ¿Actualmente cuida o apoya", "cuida_a_otro"),
    ("29) ¿A quién cuida", "cuida_a_otro_detalle"),
    ("30) ¿Gestionó la credencial de cuidador", "cuidador_credencial"),
    ("31) ¿Recibe ayuda o cuidados", "recibe_cuidados"),
    ("32) ¿Quién le brinda principalmente ese apoyo", "recibe_cuidados_quien"),
    ("33) ¿Con qué frecuencia recibe visitas", "frecuencia_visitas"),
    ("34) ¿Cuál es su situación habitacional", "situacion_habitacional"),
    ("35) La cubierta de su vivienda", "cubierta_vivienda"),
    ("36) ¿Cuál es el material predominante", "material_predominante"),
    ("37) ¿Cuándo fue la última vez que se realizó una revisión", "revision_electrica"),
    ("38) ¿Cómo es el sistema de alcantarillado", "alcantarillado_sistema"),
    ("39) ¿Tienes algún problema de obstrucción", "alcantarillado_problemas"),
    ("40) ¿Cómo considera el estado general de su vivienda", "estado_vivienda"),
    ("41) ¿Cuántas veces al día se alimenta", "alimentacion_frecuencia"),
    ("42) En qué consiste su alimentación", "alimentacion_detalle"),
    ("43) Para calefaccionarse y abrigarse", "calefaccion"),
    ("44) ¿Actualmente realiza alguna actividad laboral", "trabaja_actualmente"),
    ("45) ¿Cuál es su ocupación", "trabajo_ocupacion"),
    ("46) Ingreso mensual aproximado", "trabajo_ingreso"),
    ("47) Se encuentra pensionado", "pensionado"),
    ("48) Indique el tipo de pensión", "pension_tipo"),
    ("49) ¿Cuál es el monto aproximado", "pension_monto"),
    ("50) ¿Participa de algún Programa Social", "programa_social"),
    ("51) ¿Cuál?", "programa_social_detalle"),
    ("52) ¿Participa de alguna organización", "organizacion_participa"),
    ("53) ¿Cuál?", "organizacion_detalle"),
    ("54) ¿Asiste a talleres o actividades comunitarias", "talleres_actividades"),
    ("55) Registrar información adicional relevante", "observaciones"),
]

# Campos que en el frontend son arreglos (checkboxes)
CAMPOS_LISTA = {
    "patologias",
    "vacunas",
    "convive_con",
    "vive_otra_pm_vinculo",
    "cuida_a_otro_detalle",
    "recibe_cuidados_quien",
    "cubierta_vivienda",
    "pension_tipo",
    "talleres_actividades",
}


def _limpiar_valor(val):
    if pd.isna(val):
        return ""
    texto = str(val).strip()
    return "" if texto.lower() in ("nan", "none", "nat") else texto


def _fila_a_dict_frontend(row, columnas_map):
    """Convierte una fila del Excel al diccionario exacto que espera el Frontend y IVPM."""
    datos = {}

    for col_excel, clave_front in columnas_map.items():
        valor_limpio = _limpiar_valor(row.get(col_excel))
        if clave_front in CAMPOS_LISTA:
            if valor_limpio:
                datos[clave_front] = [x.strip() for x in valor_limpio.split(",") if x.strip()]
            else:
                datos[clave_front] = []
        else:
            datos[clave_front] = valor_limpio

    # Fallback si '12) Centro de salud' viene vacío pero la columna auxiliar 'Aunar' tiene dato
    if not datos.get("salud_centro_nombre") and "Aunar" in row:
        datos["salud_centro_nombre"] = _limpiar_valor(row.get("Aunar"))

    return datos


def importar_dataframe(df, franja="Franja 1"):
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Construir mapa de columnas reales de este Excel -> claves del sistema
    columnas_map = {}
    for col in df.columns:
        col_str = str(col).strip()
        for prefijo, clave_front in MAPEO_PREFIJOS:
            if col_str.startswith(prefijo):
                columnas_map[col] = clave_front
                break

    insertados = 0
    duplicados = 0
    errores = 0

    for _, row in df.iterrows():
        try:
            datos = _fila_a_dict_frontend(row, columnas_map)

            rut_raw = datos.get("pm_rut", "")
            rut = normalizar_rut(rut_raw) if rut_raw else SIN_RUT
            if not rut:
                rut = SIN_RUT
            datos["pm_rut"] = rut

            nombre = datos.get("pm_nombre") or "SIN NOMBRE"
            direccion = datos.get("direccion") or ""
            uv = datos.get("unidad_vecinal") or datos.get("villa") or ""
            hallazgo = datos.get("hallazgo") or ""
            datos["franja"] = franja

            edad_str = datos.get("edad", "")
            try:
                edad = int(float(edad_str)) if edad_str else None
            except ValueError:
                edad = None

            # Fecha del Excel ('Marca temporal') o fecha actual
            marca_temporal = _limpiar_valor(row.get("Marca temporal"))
            fecha_registro = marca_temporal if marca_temporal else ahora_iso()
            datos["fecha_registro"] = fecha_registro

            # Evitar duplicados si el RUT ya existe (excepto SIN RUT)
            if rut != SIN_RUT:
                existe = cursor.execute(
                    "SELECT id FROM vecinos WHERE rut = ?", (rut,)
                ).fetchone()
                if existe:
                    duplicados += 1
                    continue

            # Calcular IVPM tanto con las columnas originales como con las normalizadas
            registro_ivpm = {**{str(k): row[k] for k in df.columns}, **datos}
            score, nivel = 0, "Sin evaluar"
            try:
                score, nivel, _ = calcular_ivpm_registro(registro_ivpm)
            except Exception:
                pass

            datos_json = json.dumps(datos, ensure_ascii=False)

            cursor.execute(
                """
                INSERT INTO vecinos (
                    rut, nombre, edad, direccion, unidad_vecinal, franja,
                    hallazgo, ivpm_score, nivel_riesgo, datos_completos, fecha_registro
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (rut, nombre, edad, direccion, uv, franja, hallazgo, score, nivel, datos_json, fecha_registro),
            )
            insertados += 1
        except Exception as e:
            print(f"⚠️ Error en fila: {e}")
            errores += 1

    conn.commit()
    conn.close()
    return {"insertados": insertados, "duplicados": duplicados, "errores": errores}


if __name__ == "__main__":
    import re
    import sys

    def detectar_franja(nombre_archivo, nombre_hoja=""):
        for texto in (nombre_hoja, os.path.basename(nombre_archivo)):
            match = re.search(r"franja[\s_-]*(\d+)", str(texto), re.IGNORECASE)
            if match:
                return f"Franja {match.group(1)}"
        return "Franja 1"

    base_backend = os.path.dirname(os.path.abspath(__file__))
    raiz_proyecto = os.path.dirname(base_backend)

    if len(sys.argv) > 1:
        archivos = [sys.argv[1]]
    else:
        carpetas = [
            os.path.join(base_backend, "bd"),
            base_backend,
            raiz_proyecto,
        ]
        archivos = []
        for carpeta in carpetas:
            if os.path.isdir(carpeta):
                encontrados = [
                    f for f in glob.glob(os.path.join(carpeta, "*.xlsx"))
                    if not os.path.basename(f).startswith("~$")
                ]
                archivos.extend(encontrados)

    if not archivos:
        print("⚠️ No se encontró ningún archivo .xlsx para importar.")
    else:
        for archivo in sorted(archivos):
            xls = pd.ExcelFile(archivo)
            for hoja in xls.sheet_names:
                df = pd.read_excel(archivo, sheet_name=hoja)

                # Verifica que la hoja realmente tenga columnas de encuesta (y no sea una tabla resumen)
                es_encuesta = any(
                    str(col).strip().startswith(("1) Nombre", "5) Hallazgo", "Marca temporal", "1) Escribir dirección"))
                    for col in df.columns
                )
                if not es_encuesta:
                    print(f"⏭️ Saltando '{os.path.basename(archivo)}' (Hoja: {hoja}) -> No es hoja de encuestas")
                    continue

                franja_detectada = sys.argv[2] if len(sys.argv) > 2 else detectar_franja(archivo, hoja)
                print(f"📥 Importando '{os.path.basename(archivo)}' (Hoja: {hoja}) -> Asignado a: {franja_detectada}")
                res = importar_dataframe(df, franja=franja_detectada)
                print(f"   ✅ Resultado: {res}")