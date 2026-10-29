def calcular_ivpm_registro(row):
    """
    Calcula el IVPM global y por dimensión según la metodología de La Granja 2026.
    Retorna: (puntaje_global, nivel_riesgo, detalle_dimensiones)
    """
    # 1. Verificar si la encuesta es admisible (D2)
    hallazgo = str(row.get('5) Hallazgo/Situación de la Persona Mayor:', '')).lower()
    if 'no se encuentra' in hallazgo or 'no hay moradores' in hallazgo or 'fallecida' in hallazgo:
        return None, "No Aplica / Sin Contacto", {}

    # D3: Salud (20%) - Ejemplo de ponderación básica
    d3_score = 0.0
    patologia = str(row.get('14) ¿Presenta alguna patología de salud?:', '')).strip().lower()
    discapacidad = str(row.get('18) ¿Presenta alguna Discapacidad?:', '')).strip().lower()
    if patologia == 'sí' or patologia == 'si': d3_score += 50
    if discapacidad == 'sí' or discapacidad == 'si': d3_score += 50
    d3_score = min(d3_score, 100.0)

    # D4: Social / RSH (20%) - Reglas de RSH y Alimentación
    d4_score = 0.0
    rsh = str(row.get('10) Tramo del RSH que se encuentra la persona mayor:', ''))
    if '40%' in rsh: d4_score += 100
    elif '50%' in rsh: d4_score += 85
    elif '60%' in rsh: d4_score += 70
    elif '70%' in rsh: d4_score += 55
    elif '80%' in rsh: d4_score += 35
    elif '90%' in rsh: d4_score += 20
    else: d4_score += 10
    d4_score = min(d4_score, 100.0)

    # D6: Vivienda (20%) - Materialidad y Alcantarillado
    d6_score = 0.0
    estado_viv = str(row.get('40) ¿Cómo considera el estado general de su vivienda?:', '')).lower()
    if 'malo' in estado_viv: d6_score += 70
    elif 'regular' in estado_viv: d6_score += 35
    
    alcantarillado = str(row.get('39) ¿Tienes algún problema de obstrucción, rebalse o filtración en el sistema de alcantarillado?  ', '')).lower()
    if 'sí' in alcantarillado or 'si' in alcantarillado: d6_score += 30
    d6_score = min(d6_score, 100.0)

    # D5: Participación Comunitaria (10%)
    d5_score = 0.0
    prog_social = str(row.get('50) ¿Participa de algún Programa Social o Municipal?:', '')).lower()
    if 'no' in prog_social: d5_score += 100

    # Ponderación Global Oficial según Matriz IVPM
    # D1 (10%), D2 (10%), D3 (20%), D4 (10% lab), D5 (10% part), D6 (20% viv), D7 (20% soc)
    puntaje_global = round((d3_score * 0.20) + (d4_score * 0.20) + (d6_score * 0.20) + (d5_score * 0.10), 1)

    # Tramos Oficiales
    if puntaje_global >= 75:
        nivel = "Vulnerabilidad Crítica"
    elif puntaje_global >= 50:
        nivel = "Vulnerabilidad Alta"
    elif puntaje_global >= 25:
        nivel = "Vulnerabilidad Moderada"
    else:
        nivel = "Vulnerabilidad Baja"

    dimensiones = {
        "D3_Salud": d3_score,
        "D4_Social_RSH": d4_score,
        "D6_Vivienda": d6_score,
        "D5_Comunitaria": d5_score
    }

    return puntaje_global, nivel, dimensiones