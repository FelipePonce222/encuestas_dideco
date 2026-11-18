import json
from collections import Counter
from database import get_connection
from IVPM_calculator import calcular_ivpm_registro


def main():
    conn = get_connection()
    cursor = conn.cursor()

    filas = cursor.execute(
        "SELECT id, hallazgo, edad, datos_completos, nivel_riesgo FROM vecinos"
    ).fetchall()

    antes = Counter(f["nivel_riesgo"] or "Sin evaluar" for f in filas)
    despues = Counter()
    actualizados = 0

    for fila in filas:
        try:
            datos = json.loads(fila["datos_completos"]) if fila["datos_completos"] else {}
        except Exception:
            datos = {}

        if not isinstance(datos, dict):
            datos = {}

        if fila["hallazgo"] and "hallazgo" not in datos:
            datos["hallazgo"] = fila["hallazgo"]
        if fila["edad"] is not None and "edad" not in datos:
            datos["edad"] = fila["edad"]

        score, nivel, _ = calcular_ivpm_registro(datos)
        despues[nivel] += 1

        cursor.execute(
            "UPDATE vecinos SET ivpm_score = ?, nivel_riesgo = ? WHERE id = ?",
            (score, nivel, fila["id"]),
        )
        actualizados += 1

    conn.commit()
    conn.close()

    print(f"\n✅ Recálculo completado ({actualizados} registros revisados):\n")
    categorias = [
        "Vulnerabilidad Crítica",
        "Vulnerabilidad Alta",
        "Vulnerabilidad Moderada",
        "Vulnerabilidad Baja",
        "Sin evaluar",
    ]
    for cat in categorias:
        print(f"  - {cat:<25}: {antes.get(cat, 0):>5}  -->  {despues.get(cat, 0):>5}")


if __name__ == "__main__":
    main()