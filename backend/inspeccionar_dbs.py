"""
Muestra qué bases de datos (.db) hay en el proyecto y qué contiene cada una,
SOLO con conteos y fechas: no imprime RUT, nombres ni ningún dato personal.

Uso (desde la carpeta backend):
    python inspeccionar_dbs.py            # busca en la carpeta del proyecto
    python inspeccionar_dbs.py "C:/ruta"  # o en otra carpeta
"""
import os
import sqlite3
import sys
from datetime import datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(AQUI)
IGNORAR = {"node_modules", ".git", "venv", ".venv", "__pycache__"}


def inspeccionar(ruta):
    kb = os.path.getsize(ruta) / 1024
    mod = datetime.fromtimestamp(os.path.getmtime(ruta)).strftime("%Y-%m-%d %H:%M")
    print(f"\n{os.path.relpath(ruta, RAIZ)}   ({kb:,.0f} KB, modificada {mod})")
    try:
        conn = sqlite3.connect(f"file:{ruta}?mode=ro", uri=True)
        tablas = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        if not tablas:
            print("   (vacía: sin tablas)")
        for t in tablas:
            n = conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            extra = ""
            columnas = [c[1] for c in conn.execute(f'PRAGMA table_info("{t}")')]
            if "fecha_registro" in columnas and n:
                mn, mx = conn.execute(f'SELECT MIN(fecha_registro), MAX(fecha_registro) FROM "{t}"').fetchone()
                extra = f"  | fechas: {mn} → {mx}"
            print(f"   tabla {t}: {n} filas{extra}")
        conn.close()
    except sqlite3.Error as e:
        print(f"   no se pudo abrir: {e}")


encontradas = []
for carpeta, subcarpetas, archivos in os.walk(RAIZ):
    subcarpetas[:] = [d for d in subcarpetas if d not in IGNORAR]
    encontradas += [os.path.join(carpeta, a) for a in archivos if a.endswith((".db", ".sqlite", ".sqlite3"))]

print(f"Buscando bases de datos en: {RAIZ}")
if not encontradas:
    print("No se encontró ninguna.")
for ruta in sorted(encontradas):
    inspeccionar(ruta)