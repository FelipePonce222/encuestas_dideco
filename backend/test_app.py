"""
Pruebas del backend (etapa 2: una sola base de datos + importador único).

Se pueden ejecutar con pytest (pytest -v) o con unittest (python -m unittest -v).
Cada prueba usa una base de datos TEMPORAL: nunca toca tu base real.
"""
import importlib
import io
import os
import re
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
import normalizar_ruts_existentes as migracion  # noqa: E402
import normalizar_fechas_existentes as migracion_fechas  # noqa: E402
import auth  # noqa: E402
import usuarios  # noqa: E402
import crear_usuario  # noqa: E402
from seguridad import HASH_FALSO, es_hash, hashear_password, validar_password, verificar_password  # noqa: E402
from fechas import a_iso, ahora_iso  # noqa: E402
from rut_utils import calcular_dv, normalizar_rut, validar_rut  # noqa: E402

# Respuestas que dan puntaje 54.0 => "Vulnerabilidad Alta"
# (salud 50*0.2 + RSH 100*0.2 + vivienda 70*0.2 + participación 100*0.1)
ENCUESTA_JSON = {
    "pm_rut": "12345678-5", "pm_nombre": "Juan Soto", "edad": 82,
    "direccion": "Calle 1 #123", "villa": "Villa Las Dalias I", "franja": "Franja 1",
    "hallazgo": "La persona mayor acepta participar",
    "presenta_patologia": "Sí", "discapacidad_aplica": "No", "tramo_rsh": "Tramo 40%",
    "estado_vivienda": "Malo", "alcantarillado_problemas": "No", "programa_social": "No",
}

FILA_EXCEL = {
    "Marca temporal": "2026-06-26 10:15:00",
    "2) Rut de la persona mayor:": "12345678-5",
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


# Funcionario que se crea en cada prueba (las contraseñas ya no viven en el código)
RUT_FUNCIONARIO = "11111111-1"
CLAVE = "Clave-Segura-2026"


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
        usuarios.crear_o_actualizar(RUT_FUNCIONARIO, "José Martínez", "Trabajador Social", CLAVE)

        # Cliente SIN sesión (para probar que la API lo rechaza) y cliente CON sesión (el habitual)
        self.client_anonimo = self.m.app.test_client()
        self.token = self.client_anonimo.post(
            "/api/login", json={"rut": RUT_FUNCIONARIO, "password": CLAVE}).get_json()["token"]
        self.client = self.m.app.test_client()
        self.client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {self.token}"

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
    def login(self, rut=RUT_FUNCIONARIO, password=CLAVE):
        return self.client.post("/api/login", json={"rut": rut, "password": password})

    def test_credenciales_correctas(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["user"]["nombre"], "José Martínez")

    def test_respuesta_no_incluye_la_contrasena(self):
        cuerpo = self.login().get_data(as_text=True)
        self.assertNotIn("scrypt", cuerpo)
        self.assertNotIn(CLAVE, cuerpo)
        self.assertNotIn("password", cuerpo)

    def test_password_incorrecta(self):
        self.assertEqual(self.login(password="mala").status_code, 401)

    def test_rut_inexistente(self):
        self.assertEqual(self.login(rut="22222222-2").status_code, 401)

    def test_mismo_mensaje_si_no_existe_el_rut_o_la_clave_es_mala(self):
        a = self.login(rut="22222222-2").get_json()
        b = self.login(password="mala").get_json()
        self.assertEqual(a, b)

    def test_password_vacia_o_ausente(self):
        self.assertEqual(self.login(password="").status_code, 401)
        self.assertEqual(self.client.post("/api/login", json={"rut": RUT_FUNCIONARIO}).status_code, 401)

    def test_la_clave_se_guarda_como_hash(self):
        conn = sqlite3.connect(self.db_file)
        guardado = conn.execute("SELECT password FROM funcionario WHERE rut = ?", (RUT_FUNCIONARIO,)).fetchone()[0]
        conn.close()
        self.assertNotEqual(guardado, CLAVE)
        self.assertTrue(es_hash(guardado))

    def test_texto_plano_sin_convertir_no_sirve_para_entrar(self):
        conn = sqlite3.connect(self.db_file)
        conn.execute("INSERT INTO funcionario (rut, nombre, cargo, password) VALUES ('33333333-3', 'x', 'x', 'textoplano1')")
        conn.commit()
        conn.close()
        self.assertEqual(self.login(rut="33333333-3", password="textoplano1").status_code, 401)

    def test_al_iniciar_convierte_las_claves_antiguas_a_hash(self):
        conn = sqlite3.connect(self.db_file)
        conn.execute("INSERT INTO funcionario (rut, nombre, cargo, password) VALUES ('33333333-3', 'x', 'x', 'textoplano1')")
        conn.commit()
        conn.close()

        database.init_db()      # lo mismo que ocurre al arrancar el servidor

        conn = sqlite3.connect(self.db_file)
        h1 = conn.execute("SELECT password FROM funcionario WHERE rut = '33333333-3'").fetchone()[0]
        conn.close()
        self.assertTrue(es_hash(h1))
        self.assertEqual(self.login(rut="33333333-3", password="textoplano1").status_code, 200)

        database.init_db()      # segunda vez: no vuelve a cambiar nada
        conn = sqlite3.connect(self.db_file)
        h2 = conn.execute("SELECT password FROM funcionario WHERE rut = '33333333-3'").fetchone()[0]
        conn.close()
        self.assertEqual(h1, h2)

    def test_base_nueva_no_trae_usuarios_en_el_codigo(self):
        with tempfile.TemporaryDirectory() as otra:
            with patch.object(database, "DB_PATH", os.path.join(otra, "nueva.db")):
                database.init_db()
                conn = sqlite3.connect(database.DB_PATH)
                n = conn.execute("SELECT COUNT(*) FROM funcionario").fetchone()[0]
                conn.close()
        self.assertEqual(n, 0)


class TestSeguridadPasswords(unittest.TestCase):
    def test_hash_y_verificacion(self):
        h = hashear_password("Otra-Clave-123")
        self.assertTrue(es_hash(h))
        self.assertTrue(verificar_password(h, "Otra-Clave-123"))
        self.assertFalse(verificar_password(h, "otra-clave-123"))
        self.assertNotEqual(h, hashear_password("Otra-Clave-123"))   # cada hash lleva su propia sal

    def test_nunca_acepta_texto_plano(self):
        self.assertFalse(verificar_password("admin123", "admin123"))
        self.assertFalse(verificar_password(None, "x"))
        self.assertFalse(verificar_password("", ""))

    def test_hash_de_relleno_es_un_hash_valido(self):
        self.assertTrue(es_hash(HASH_FALSO))

    def test_reglas_de_contrasena(self):
        self.assertIsNone(validar_password("Clave-Segura-2026", "11111111-1"))
        for mala in ["", "corta", " conespacios1", "conespacios1 ", "aaaaaaaaaa", "admin123", "Dideco2026",
                     "contraprueba", "x11111111x"]:
            self.assertIsNotNone(validar_password(mala, "11111111-1"), mala)


class TestUsuarios(BaseTest):
    def test_crear_y_actualizar(self):
        self.assertEqual(usuarios.crear_o_actualizar("6.000.000-k", "Ana Pérez", "Coordinadora", "Otra-Clave-123"), "creado")
        self.assertEqual(usuarios.crear_o_actualizar("6000000-K", password="Nueva-Clave-456"), "actualizado")
        self.assertEqual(self.login_con("6000000-K", "Nueva-Clave-456").status_code, 200)
        self.assertEqual(self.login_con("6000000-K", "Otra-Clave-123").status_code, 401)
        ana = [f for f in usuarios.listar() if f["rut"] == "6000000-K"][0]
        self.assertEqual((ana["nombre"], ana["cargo"], ana["protegida"]), ("Ana Pérez", "Coordinadora", True))

    def login_con(self, rut, password):
        return self.client.post("/api/login", json={"rut": rut, "password": password})

    def test_rechaza_rut_invalido_y_clave_debil(self):
        with self.assertRaises(ValueError):
            usuarios.crear_o_actualizar("12345678-9", "x", "x", "Clave-Segura-2026")
        with self.assertRaises(ValueError):
            usuarios.crear_o_actualizar("6000000-K", "x", "x", "123")
        with self.assertRaises(ValueError):
            usuarios.crear_o_actualizar("6000000-K", "", "x", "Clave-Segura-2026")   # falta el nombre

    def test_eliminar(self):
        self.assertTrue(usuarios.eliminar("11.111.111-1"))
        self.assertFalse(usuarios.eliminar("11111111-1"))
        self.assertEqual(self.login_con(RUT_FUNCIONARIO, CLAVE).status_code, 401)


class TestScriptCrearUsuario(BaseTest):
    def correr(self, argv, entradas=(), claves=()):
        with patch("builtins.input", side_effect=list(entradas)), \
             patch("getpass.getpass", side_effect=list(claves)), \
             patch("sys.stdout", new=io.StringIO()) as salida:
            codigo = crear_usuario.main(argv)
        return codigo, salida.getvalue()

    def test_crear_pide_dos_veces_y_reintenta_si_no_coinciden_o_es_debil(self):
        claves = ["corta", "Clave-Nueva-789", "distinta", "Clave-Nueva-789", "Clave-Nueva-789"]
        codigo, salida = self.correr([], ["21.555.499-6", "Camila Silva", "Coordinadora"], claves)
        self.assertEqual(codigo, 0)
        self.assertIn("al menos 8", salida)
        self.assertIn("no coinciden", salida)
        self.assertEqual(self.client.post("/api/login", json={"rut": "21555499-6", "password": "Clave-Nueva-789"}).status_code, 200)

    def test_no_crea_un_rut_que_ya_existe(self):
        codigo, salida = self.correr([], [RUT_FUNCIONARIO, "x", "x"])
        self.assertEqual(codigo, 1)
        self.assertIn("ya existe", salida)

    def test_cambiar_clave(self):
        codigo, _ = self.correr(["--cambiar-clave", "11.111.111-1"], claves=["Clave-Renovada-55", "Clave-Renovada-55"])
        self.assertEqual(codigo, 0)
        self.assertEqual(self.client.post("/api/login", json={"rut": RUT_FUNCIONARIO, "password": "Clave-Renovada-55"}).status_code, 200)
        self.assertEqual(self.client.post("/api/login", json={"rut": RUT_FUNCIONARIO, "password": CLAVE}).status_code, 401)

    def test_listar_no_muestra_contrasenas(self):
        codigo, salida = self.correr(["--listar"])
        self.assertEqual(codigo, 0)
        self.assertIn("José Martínez", salida)
        self.assertNotIn("scrypt", salida)

    def test_eliminar_pide_confirmacion(self):
        codigo, _ = self.correr(["--eliminar", RUT_FUNCIONARIO], ["no"])
        self.assertEqual(codigo, 1)
        codigo, salida = self.correr(["--eliminar", RUT_FUNCIONARIO], ["SI"])
        self.assertEqual(codigo, 0)
        self.assertIn("Eliminado", salida)


class TestEncuestas(BaseTest):
    def test_guarda_y_calcula_ivpm(self):
        r = self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        self.assertEqual(r.status_code, 201)
        body = r.get_json()
        self.assertEqual(body["ivpm_score"], 54.0)
        self.assertEqual(body["nivel_riesgo"], "Vulnerabilidad Alta")
        fila = self.filas()[0]
        self.assertEqual(fila["rut"], "12345678-5")
        self.assertEqual(fila["franja"], "Franja 1")
        self.assertIn("Juan Soto", fila["datos_completos"])

    def test_buscar_vecino_devuelve_detalle(self):
        self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        r = self.client.get("/api/vecino/12345678-5")
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
        self.assertEqual(self.client.get("/api/buscar/12345678-5").status_code, 404)


class TestImportador(BaseTest):
    def test_importa_y_calcula_en_la_base_unica(self):
        otra = {**FILA_EXCEL, "2) Rut de la persona mayor:": "98765432-5",
                "Marca temporal": "2026-06-26 11:00:00"}
        r = self.subir_excel([FILA_EXCEL, otra])
        self.assertEqual(r.status_code, 200)
        self.assertIn("2 registros", r.get_json()["mensaje"])
        fila = self.filas()[0]
        self.assertEqual(fila["rut"], "12345678-5")
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


class TestRutUtils(unittest.TestCase):
    def test_normaliza_distintas_formas(self):
        for entrada in ["12.345.678-5", "12345678-5", "123456785", "12345678 5", " 12.345.678-5 "]:
            self.assertEqual(normalizar_rut(entrada), "12345678-5", entrada)
        self.assertEqual(normalizar_rut("7.654.321-k"), "7654321-K")
        self.assertEqual(normalizar_rut("007654321-K"), "7654321-K")

    def test_no_destruye_texto_que_no_es_rut(self):
        self.assertEqual(normalizar_rut("SIN RUT"), "SIN RUT")
        self.assertEqual(normalizar_rut(None), "")
        self.assertEqual(normalizar_rut(""), "")

    def test_validacion_modulo_11(self):
        for rut in ["12345678-5", "11111111-1", "21555499-6", "6.000.000-K", "98765432-5"]:
            self.assertTrue(validar_rut(rut), rut)
        for rut in ["12345678-9", "12345678-K", "0-0", "SIN RUT", "", "abc"]:
            self.assertFalse(validar_rut(rut), rut)

    def test_calcular_dv(self):
        self.assertEqual(calcular_dv("12345678"), "5")
        self.assertEqual(calcular_dv("6000000"), "K")


class TestRutEnLaApi(BaseTest):
    def test_login_acepta_rut_con_puntos(self):
        # el funcionario está guardado como 11111111-1
        r = self.client.post("/api/login", json={"rut": "11.111.111-1", "password": CLAVE})
        self.assertEqual(r.status_code, 200)

    def test_login_sin_datos_no_revienta(self):
        r = self.client.post("/api/login", json={"rut": None, "password": None})
        self.assertEqual(r.status_code, 401)

    def test_encuesta_guarda_rut_normalizado(self):
        r = self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "pm_rut": "12.345.678-5"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.filas()[0]["rut"], "12345678-5")
        detalle = self.client.get("/api/vecino/12345678-5").get_json()["encuesta_detalle"]
        self.assertEqual(detalle["pm_rut"], "12345678-5")

    def test_encuesta_con_dv_invalido_se_rechaza(self):
        r = self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "pm_rut": "12345678-9"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("RUT inválido", r.get_json()["error"])
        self.assertEqual(self.filas(), [])

    def test_encuesta_sin_rut_queda_como_sin_rut(self):
        for valor in ["", None, "  ", "sin rut"]:
            self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "pm_rut": valor})
        self.assertEqual([f["rut"] for f in self.filas()], ["SIN RUT"] * 4)

    def test_busqueda_encuentra_con_cualquier_formato(self):
        self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "pm_rut": "6.000.000-k"})
        for consulta in ["6000000-K", "6.000.000-K", "6000000-k", "6000000K"]:
            r = self.client.get(f"/api/vecino/{consulta}")
            self.assertEqual(r.status_code, 200, consulta)

    def test_importador_guarda_rut_normalizado_y_sin_rut(self):
        self.subir_excel([
            {**FILA_EXCEL, "2) Rut de la persona mayor:": "12.345.678-5"},
            {**FILA_EXCEL, "2) Rut de la persona mayor:": None, "Marca temporal": "2026-06-26 12:00:00"},
        ])
        self.assertEqual([f["rut"] for f in self.filas()], ["12345678-5", "SIN RUT"])


class TestMigracionDeRut(BaseTest):
    def sembrar(self):
        """Datos 'antiguos' con RUT escritos de distintas formas."""
        conn = sqlite3.connect(self.db_file)
        for rut in ["12.345.678-5", "12345678-5", "123456785", "6000000-k", "nan", "", "12345678-9", "texto raro"]:
            conn.execute("INSERT INTO vecinos (rut, nombre) VALUES (?, 'x')", (rut,))
        conn.commit()
        conn.close()

    def test_simulacion_no_modifica_nada(self):
        self.sembrar()
        antes = [f["rut"] for f in self.filas()]
        conn = database.get_connection()
        r = migracion.analizar(conn)
        conn.close()
        self.assertEqual([f["rut"] for f in self.filas()], antes)
        self.assertEqual(r["total"], 8)
        self.assertEqual(len(r["ids_dv_invalido"]), 1)
        self.assertEqual(len(r["ids_formato_raro"]), 1)
        self.assertEqual(r["ruts_con_varias_encuestas"], 1)   # 12345678-5 aparece 3 veces

    def test_aplicar_normaliza_y_hace_respaldo(self):
        self.sembrar()
        conn = database.get_connection()
        r = migracion.analizar(conn)
        destino = migracion.respaldar()
        migracion.aplicar(conn, r["cambios"])
        conn.close()

        self.assertEqual([f["rut"] for f in self.filas()],
                         ["12345678-5", "12345678-5", "12345678-5", "6000000-K",
                          "SIN RUT", "SIN RUT", "12345678-9", "texto raro"])

        # el respaldo conserva los datos originales sin cambios
        self.assertTrue(os.path.exists(destino))
        copia = sqlite3.connect(destino)
        originales = [r[0] for r in copia.execute("SELECT rut FROM vecinos ORDER BY id")]
        copia.close()
        self.assertEqual(originales[0], "12.345.678-5")
        self.assertEqual(originales[4], "nan")

    def test_segunda_pasada_no_cambia_nada(self):
        self.sembrar()
        conn = database.get_connection()
        migracion.aplicar(conn, migracion.analizar(conn)["cambios"])
        self.assertEqual(migracion.analizar(conn)["cambios"], [])
        conn.close()


class TestEncuestaMasReciente(BaseTest):
    def guardar(self, hallazgo, rut="12345678-5"):
        r = self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "pm_rut": rut, "hallazgo": hallazgo})
        self.assertEqual(r.status_code, 201)

    def test_con_varias_encuestas_devuelve_la_ultima(self):
        self.guardar("primera visita")
        self.guardar("segunda visita")
        self.guardar("tercera visita")
        body = self.client.get("/api/vecino/12.345.678-5").get_json()
        self.assertEqual(body["hallazgo"], "tercera visita")
        self.assertEqual(body["total_encuestas_rut"], 3)

    def test_una_sola_encuesta_cuenta_uno(self):
        self.guardar("unica")
        body = self.client.get("/api/vecino/12345678-5").get_json()
        self.assertEqual(body["total_encuestas_rut"], 1)

    def test_no_mezcla_ruts_distintos(self):
        self.guardar("de Juan", rut="12345678-5")
        self.guardar("de otra persona", rut="11111111-1")
        self.assertEqual(self.client.get("/api/vecino/12345678-5").get_json()["hallazgo"], "de Juan")
        self.assertEqual(self.client.get("/api/vecino/11111111-1").get_json()["total_encuestas_rut"], 1)

    def test_no_se_puede_buscar_por_sin_rut(self):
        self.guardar("sin rut", rut="")
        for consulta in ["SIN RUT", "sin rut", "SIN%20RUT"]:
            self.assertEqual(self.client.get(f"/api/vecino/{consulta}").status_code, 404, consulta)


ISO = r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$"


class TestFechasUtils(unittest.TestCase):
    def test_convierte_formato_es_cl_a_iso(self):
        self.assertEqual(a_iso("09-11-2026, 16:45:30"), "2026-11-09 16:45:30")
        self.assertEqual(a_iso("9-1-2026, 8:05:03"), "2026-01-09 08:05:03")
        self.assertEqual(a_iso("09-11-2026, 04:45:30 p. m."), "2026-11-09 16:45:30")
        self.assertEqual(a_iso("09-11-2026, 12:10:00 a. m."), "2026-11-09 00:10:00")

    def test_deja_iso_igual(self):
        self.assertEqual(a_iso("2026-06-26 10:15:00"), "2026-06-26 10:15:00")
        self.assertEqual(a_iso("2026-06-26T10:15:00.123"), "2026-06-26 10:15:00")

    def test_no_adivina(self):
        for raro in ["", None, "ayer", "31-02-2026, 10:00:00", "13/25/2026"]:
            self.assertIsNone(a_iso(raro), raro)

    def test_ahora_iso_tiene_formato_iso(self):
        self.assertRegex(ahora_iso(), ISO)


class TestFechaLaPoneElServidor(BaseTest):
    def test_ignora_la_fecha_del_navegador(self):
        r = self.client.post("/api/encuestas", json={**ENCUESTA_JSON, "fecha_registro": "01-01-1999, 00:00:00"})
        self.assertEqual(r.status_code, 201)
        fila = self.filas()[0]
        self.assertRegex(fila["fecha_registro"], ISO)
        self.assertNotIn("1999", fila["fecha_registro"])
        self.assertEqual(r.get_json()["fecha_registro"], fila["fecha_registro"])
        self.assertIn(fila["fecha_registro"], fila["datos_completos"])   # el JSON de respaldo coincide

    def test_funciona_sin_enviar_fecha(self):
        self.client.post("/api/encuestas", json=ENCUESTA_JSON)
        self.assertRegex(self.filas()[0]["fecha_registro"], ISO)

    def test_recientes_ordena_de_la_mas_nueva_a_la_mas_antigua(self):
        conn = sqlite3.connect(self.db_file)
        for rut, fecha in [("1-9", "2026-06-01 10:00:00"), ("2-7", "2026-11-09 16:45:30"), ("3-5", "2026-08-15 09:00:00")]:
            conn.execute("INSERT INTO vecinos (rut, nombre, fecha_registro) VALUES (?, 'x', ?)", (rut, fecha))
        conn.commit()
        conn.close()
        ruts = [f["rut"] for f in self.client.get("/api/encuestas/recientes").get_json()]
        self.assertEqual(ruts, ["2-7", "3-5", "1-9"])

    def test_importador_guarda_marca_temporal_en_iso(self):
        self.subir_excel([{**FILA_EXCEL, "Marca temporal": "26-06-2026, 10:15:00"}])
        self.assertEqual(self.filas()[0]["fecha_registro"], "2026-06-26 10:15:00")


class TestMigracionDeFechas(BaseTest):
    def sembrar(self):
        conn = sqlite3.connect(self.db_file)
        for fecha in ["09-11-2026, 16:45:30", "2026-06-26 10:15:00", "9-1-2026, 8:05:03", None, "", "cualquier cosa"]:
            conn.execute("INSERT INTO vecinos (rut, nombre, fecha_registro) VALUES ('x', 'x', ?)", (fecha,))
        conn.commit()
        conn.close()

    def fechas(self):
        return [f["fecha_registro"] for f in self.filas()]

    def test_simulacion_no_modifica_nada(self):
        self.sembrar()
        antes = self.fechas()
        conn = database.get_connection()
        r = migracion_fechas.analizar(conn)
        conn.close()
        self.assertEqual(self.fechas(), antes)
        self.assertEqual(len(r["cambios"]), 2)
        self.assertEqual(r["sin_cambio"], 1)
        self.assertEqual(len(r["ids_sin_fecha"]), 2)
        self.assertEqual(len(r["ids_no_reconocidas"]), 1)

    def test_aplicar_convierte_respalda_y_no_toca_lo_demas(self):
        self.sembrar()
        conn = database.get_connection()
        r = migracion_fechas.analizar(conn)
        destino = migracion_fechas.respaldar()
        migracion_fechas.aplicar(conn, r["cambios"])
        conn.close()
        self.assertEqual(self.fechas(), ["2026-11-09 16:45:30", "2026-06-26 10:15:00", "2026-01-09 08:05:03",
                                         None, "", "cualquier cosa"])
        copia = sqlite3.connect(destino)
        self.assertEqual(copia.execute("SELECT fecha_registro FROM vecinos WHERE id = 1").fetchone()[0],
                         "09-11-2026, 16:45:30")
        copia.close()

    def test_segunda_pasada_no_cambia_nada(self):
        self.sembrar()
        conn = database.get_connection()
        migracion_fechas.aplicar(conn, migracion_fechas.analizar(conn)["cambios"])
        self.assertEqual(migracion_fechas.analizar(conn)["cambios"], [])
        conn.close()


class TestSesionesToken(BaseTest):
    def rutas_api(self):
        """Todas las rutas /api/ de la app (menos las públicas), con sus métodos."""
        rutas = []
        for regla in self.m.app.url_map.iter_rules():
            if not regla.rule.startswith("/api/") or regla.rule in auth.RUTAS_PUBLICAS:
                continue
            ruta = re.sub(r"<[^>]+>", "x", regla.rule)
            for metodo in regla.methods - {"OPTIONS", "HEAD"}:
                rutas.append((metodo, ruta))
        return rutas

    def test_login_entrega_token_y_duracion(self):
        cuerpo = self.client_anonimo.post("/api/login", json={"rut": RUT_FUNCIONARIO, "password": CLAVE}).get_json()
        self.assertTrue(cuerpo["token"])
        self.assertEqual(cuerpo["expira_en"], auth.segundos_de_sesion())

    def test_login_fallido_no_entrega_token(self):
        cuerpo = self.client_anonimo.post("/api/login", json={"rut": RUT_FUNCIONARIO, "password": "mala"}).get_json()
        self.assertNotIn("token", cuerpo)

    def test_TODAS_las_rutas_de_la_api_exigen_sesion(self):
        rutas = self.rutas_api()
        self.assertGreaterEqual(len(rutas), 6)          # que la prueba no quede vacía por error
        for metodo, ruta in rutas:
            r = getattr(self.client_anonimo, metodo.lower())(ruta)
            self.assertEqual(r.status_code, 401, f"{metodo} {ruta} quedó sin proteger")
            self.assertEqual(r.get_json()["codigo"], "sesion_invalida")

    def test_una_ruta_nueva_queda_protegida_automaticamente(self):
        """Denegar por defecto: una ruta /api/ agregada mañana ya nace protegida."""
        from flask import Flask
        otra = Flask("otra_app")
        auth.proteger_api(otra)

        @otra.route("/api/ruta-nueva-de-prueba")
        def ruta_nueva():
            return "secreto"

        sin_sesion = otra.test_client()
        con_sesion = otra.test_client()
        self.assertEqual(sin_sesion.get("/api/ruta-nueva-de-prueba").status_code, 401)
        self.assertEqual(con_sesion.get("/api/ruta-nueva-de-prueba",
                                        headers={"Authorization": f"Bearer {self.token}"}).status_code, 200)

    def test_con_token_las_rutas_funcionan(self):
        self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 200)
        self.assertEqual(self.client.post("/api/encuestas", json=ENCUESTA_JSON).status_code, 201)
        self.assertEqual(self.client.get("/api/vecino/12345678-5").status_code, 200)
        self.assertEqual(self.client.get("/api/reports/excel").status_code, 200)   # con datos que exportar

    def test_el_login_sigue_siendo_publico(self):
        self.assertEqual(self.client_anonimo.post("/api/login", json={}).status_code, 401)   # 401 por credenciales, no por sesión
        self.assertNotIn("codigo", self.client_anonimo.post("/api/login", json={}).get_json())

    def test_preflight_options_no_exige_token(self):
        self.assertEqual(self.client_anonimo.options("/api/encuestas").status_code, 200)

    def test_tokens_invalidos(self):
        for cabecera in ["Bearer token-falso", "Bearer ", "Bearer", "Basic abc", self.token, "", "Bearer " + self.token + "x"]:
            r = self.client_anonimo.get("/api/dashboard/stats", headers={"Authorization": cabecera})
            self.assertEqual(r.status_code, 401, repr(cabecera))

    def test_acepta_bearer_en_minusculas(self):
        r = self.client_anonimo.get("/api/dashboard/stats", headers={"Authorization": f"bearer {self.token}"})
        self.assertEqual(r.status_code, 200)

    def test_token_firmado_con_otra_clave_no_sirve(self):
        from itsdangerous import URLSafeTimedSerializer
        falso = URLSafeTimedSerializer("otra-clave-distinta", salt="dideco-sesion-v1").dumps({"id": 1, "h": "x"})
        r = self.client_anonimo.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {falso}"})
        self.assertEqual(r.status_code, 401)

    def test_token_expirado(self):
        import time
        with patch.object(auth, "HORAS_SESION", 0.0001):        # 0,36 segundos
            token = self.client_anonimo.post(
                "/api/login", json={"rut": RUT_FUNCIONARIO, "password": CLAVE}).get_json()["token"]
            time.sleep(1.2)
            r = self.client_anonimo.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 401)

    def test_al_cambiar_la_contrasena_los_tokens_antiguos_dejan_de_servir(self):
        self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 200)
        usuarios.crear_o_actualizar(RUT_FUNCIONARIO, password="Clave-Renovada-55")
        self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 401)

    def test_al_eliminar_al_funcionario_su_token_deja_de_servir(self):
        usuarios.eliminar(RUT_FUNCIONARIO)
        self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 401)

    def test_la_clave_secreta_se_crea_una_vez_y_se_reutiliza(self):
        ruta = os.path.join(os.path.dirname(self.db_file), ".secret_key")
        self.assertTrue(os.path.exists(ruta))
        with open(ruta) as f:
            guardada = f.read().strip()
        self.assertGreaterEqual(len(guardada), 32)
        auth._claves.clear()                                   # simula reiniciar el servidor
        self.assertEqual(auth._clave_secreta(), guardada)
        self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 200)   # el token sigue valiendo

    def test_la_clave_puede_venir_del_entorno(self):
        with patch.dict(os.environ, {"DIDECO_SECRET_KEY": "clave-del-servidor-" + "x" * 20}):
            self.assertEqual(auth._clave_secreta(), "clave-del-servidor-" + "x" * 20)
            # con otra clave, el token emitido antes ya no es válido
            self.assertEqual(self.client.get("/api/dashboard/stats").status_code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)