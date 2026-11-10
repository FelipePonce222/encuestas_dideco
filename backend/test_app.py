"""
Pruebas del backend (etapa 2: una sola base de datos + importador único).

Se pueden ejecutar con pytest (pytest -v) o con unittest (python -m unittest -v).
Cada prueba usa una base de datos TEMPORAL: nunca toca tu base real.
"""
import importlib
import io
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

import database  # noqa: E402

# Respuestas que dan puntaje 54.0 => "Vulnerabilidad Alta"
# (salud 50*0.2 + RSH 100*0.2 + vivienda 70*0.2 + participación 100*0.1)
ENCUESTA_JSON = {
    "pm_rut": "12345678-9", "pm_nombre": "Juan Soto", "edad": 82,
    "direccion": "Calle 1 #123", "villa": "Villa Las Dalias I", "franja": "Franja 1",
    "hallazgo": "La persona mayor acepta participar",
    "presenta_patologia": "Sí", "discapacidad_aplica": "No", "tramo_rsh": "Tramo 40%",
    "estado_vivienda": "Malo", "alcantarillado_problemas": "No", "programa_social": "No",
}

FILA_EXCEL = {
    "Marca temporal": "2026-06-26 10:15:00",
    "2) Rut de la persona mayor:": "12345678-9",
    "1) Nombre Completo de la persona mayor:": "Juan Soto",
    "5) Edad:": 82,
    "1) Escribir dirección completa: ": "Calle 1 #123",
    "2) Seleccionar Número de Unidad Vecinal:": "12",
    "5) Hallazgo/Situación de la Persona Mayor:": "La persona mayor acepta participar",
    "14) ¿Presenta alguna patología de salud?:": "Sí",
    "18) ¿Presenta alguna Discapacidad?:": "No",
    "10) Tramo del RSH que se encuentra la persona mayor:": "Tramo 40%",
    "40) ¿Cómo considera el estado general de su vivienda?:": "Malo",
    "50) ¿Participa de algún Programa Social o Municipal?:": "No",
}


def excel_bytes(filas):
    buf = io.BytesIO()
    pd.DataFrame(filas).to_excel(buf, index=False)
    buf.seek(0)
    return buf


class BaseTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_file = os.path.join(self.tmp.name, "test.db")

        # Toda la app lee database.DB_PATH al abrir conexión => basta con parchearlo
        p = patch.object(database, "DB_PATH", self.db_file)
        p.start()
        self.addCleanup(p.stop)

        import app as app_module
        self.m = importlib.reload(app_module)   # al importar crea las tablas en la BD temporal
        self.m.app.config["TESTING"] = True
        self.client = self.m.app.test_client()

    def filas(self):
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM vecinos").fetchall()
        conn.close()
        return rows

    def subir_excel(self, filas, nombre="datos.xlsx", **extra):
        return self.client.post(
            "/api/importar-excel",
            data={"file": (excel_bytes(filas), nombre), **extra},
            content_type="multipart/form-data",
        )


class TestBaseUnica(BaseTest):
    def test_se_crea_solo_la_base_configurada(self):
        self.assertTrue(os.path.exists(self.db_file))
        conn = sqlite3.connect(self.db_file)
        tablas = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        conn.close()
        self.assertIn("vecinos", tablas)
        self.assertIn("funcionario", tablas)

    def test_la_ruta_por_defecto_no_depende_de_desde_donde_se_ejecute(self):
        """Antes la ruta era relativa y abría una BD distinta según la carpeta de ejecución."""
        env = {k: v for k, v in os.environ.items() if k != "DIDECO_DB_PATH"}
        salida = subprocess.run(
            [sys.executable, "-c", f"import sys; sys.path.insert(0, r'{BACKEND_DIR}'); import database; print(database.DB_PATH)"],
            cwd=self.tmp.name, env=env, capture_output=True, text=True,
        ).stdout.strip()
        self.assertEqual(salida, os.path.join(BACKEND_DIR, "dideco_encuestas.db"))

    def test_variable_de_entorno_cambia_la_ruta(self):
        destino = os.path.join(self.tmp.name, "otra", "mi.db")
        salida = subprocess.run(
            [sys.executable, "-c", f"import sys; sys.path.insert(0, r'{BACKEND_DIR}'); import database; print(database.DB_PATH)"],
            cwd=self.tmp.name, env={**os.environ, "DIDECO_DB_PATH": destino},
            capture_output=True, text=True,
        ).stdout.strip()
        self.assertEqual(salida, destino)


class TestLogin(BaseTest):
    def test_credenciales_correctas(self):
        r = self.client.post("/api/login", json={"rut": "12345678-9", "password": "admin123"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["user"]["nombre"], "José Martínez")

    def test_password_incorrecta(self):
        r = self.client.post("/api/login", json={"rut": "12345678-9", "password": "mala"})
        self.assertEqual(r.status_code, 401)


class TestEncuestas(BaseTest):
    def test_guarda_y_calcula_ivpm(self):
        r = self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        self.assertEqual(r.status_code, 201)
        body = r.get_json()
        self.assertEqual(body["ivpm_score"], 54.0)
        self.assertEqual(body["nivel_riesgo"], "Vulnerabilidad Alta")
        fila = self.filas()[0]
        self.assertEqual(fila["rut"], "12345678-9")
        self.assertEqual(fila["franja"], "Franja 1")
        self.assertIn("Juan Soto", fila["datos_completos"])

    def test_buscar_vecino_devuelve_detalle(self):
        self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        r = self.client.get("/api/vecino/12345678-9")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["encuesta_detalle"]["pm_nombre"], "Juan Soto")

    def test_vecino_inexistente(self):
        self.assertEqual(self.client.get("/api/vecino/00000000-0").status_code, 404)

    def test_dashboard_cuenta_lo_guardado(self):
        self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        stats = self.client.get("/api/dashboard/stats").get_json()
        self.assertEqual(stats["total_encuestas"], 1)
        self.assertEqual(stats["niveles_riesgo"]["Vulnerabilidad Alta"], 1)

    def test_excel_de_informes_incluye_lo_guardado(self):
        self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        r = self.client.get("/api/reports/excel")
        self.assertEqual(r.status_code, 200)
        df = pd.read_excel(io.BytesIO(r.data))
        self.assertEqual(df.loc[0, "Nombre Completo"], "Juan Soto")

    def test_rutas_antiguas_eliminadas(self):
        self.assertEqual(self.client.get("/api/buscar/12345678-9").status_code, 404)


class TestImportador(BaseTest):
    def test_importa_y_calcula_en_la_base_unica(self):
        otra = {**FILA_EXCEL, "2) Rut de la persona mayor:": "98765432-1",
                "Marca temporal": "2026-06-26 11:00:00"}
        r = self.subir_excel([FILA_EXCEL, otra])
        self.assertEqual(r.status_code, 200)
        self.assertIn("2 registros", r.get_json()["mensaje"])
        fila = self.filas()[0]
        self.assertEqual(fila["rut"], "12345678-9")
        self.assertEqual(fila["edad"], 82)                      # entero nativo, no BLOB
        self.assertIsInstance(fila["edad"], int)
        self.assertEqual(fila["ivpm_score"], 54.0)
        self.assertEqual(fila["nivel_riesgo"], "Vulnerabilidad Alta")
        self.assertEqual(fila["franja"], "Franja 1")
        self.assertIn("Juan Soto", fila["datos_completos"])

    def test_reimportar_no_duplica(self):
        self.subir_excel([FILA_EXCEL])
        r = self.subir_excel([FILA_EXCEL])
        self.assertEqual(r.get_json()["insertados"], 0)
        self.assertEqual(r.get_json()["duplicados"], 1)
        self.assertEqual(len(self.filas()), 1)

    def test_franja_personalizada(self):
        self.subir_excel([FILA_EXCEL], franja="Franja 2")
        self.assertEqual(self.filas()[0]["franja"], "Franja 2")

    def test_filas_vacias_se_omiten(self):
        r = self.subir_excel([FILA_EXCEL, {"Marca temporal": "2026-06-27 09:00:00"}])
        self.assertEqual(r.get_json()["omitidos"], 1)
        self.assertEqual(len(self.filas()), 1)

    def test_edad_vacia_queda_null(self):
        self.subir_excel([{**FILA_EXCEL, "5) Edad:": None}])
        self.assertIsNone(self.filas()[0]["edad"])

    def test_sin_archivo(self):
        self.assertEqual(self.client.post("/api/importar-excel").status_code, 400)

    def test_archivo_que_no_es_excel(self):
        r = self.client.post(
            "/api/importar-excel",
            data={"file": (io.BytesIO(b"texto plano"), "malo.xlsx")},
            content_type="multipart/form-data",
        )
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)