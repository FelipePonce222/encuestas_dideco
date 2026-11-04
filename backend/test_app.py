import importlib
import io
import sqlite3

import pandas as pd
import pytest


# ---------------------------------------------------------------- fixtures
@pytest.fixture
def m(tmp_path, monkeypatch):
    """Módulo de la app aislado: BD temporal y cálculo IVPM falso (determinista)."""
    monkeypatch.chdir(tmp_path)          # evita ensuciar la BD real al importar
    import app as module
    importlib.reload(module)

    db_file = str(tmp_path / "test.db")
    monkeypatch.setattr(module, "DB_NAME", db_file)
    monkeypatch.setattr(module, "DB_PATH", db_file)
    module.init_db()                     # crea tabla vecinos en la BD temporal

    # tabla funcionario para el login
    conn = sqlite3.connect(db_file)
    conn.execute("""CREATE TABLE funcionario (
        id_funcionario INTEGER PRIMARY KEY, rut TEXT, password TEXT,
        nombre TEXT, cargo TEXT)""")
    conn.execute("INSERT INTO funcionario VALUES (1,'11111111-1','clave123','Ana Pérez','Asistente Social')")
    conn.commit()
    conn.close()

    def fake_get_connection():
        c = sqlite3.connect(db_file)
        c.row_factory = sqlite3.Row
        return c

    monkeypatch.setattr(module, "get_connection", fake_get_connection)
    monkeypatch.setattr(module, "calcular_ivpm_registro", lambda r: (7.5, "Alto", {}))
    module.app.config["TESTING"] = True
    module.db_file = db_file
    return module


@pytest.fixture
def client(m):
    return m.app.test_client()
