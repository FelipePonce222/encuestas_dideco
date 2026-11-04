def calcular_ivpm_registro(row):
    """
    Calcula el IVPM global y por dimensión según la metodología de La Granja 2026.
    Retorna: (puntaje_global, nivel_riesgo, detalle_dimensiones)
    """
    # Helper para buscar valores aceptando llaves de React (snake_case) o de la encuesta impresa
    def get_val(keys_list):
        for k in keys_list:
            if k in row and row[k] is not None:
                return str(row[k]).strip().lower()
        return ''

    # 1. Verificar si la encuesta es admisible (D2)
    hallazgo = get_val(['hallazgo', '5) Hallazgo/Situación de la Persona Mayor:'])
    if 'no se encuentra' in hallazgo or 'no hay moradores' in hallazgo or 'fallecida' in hallazgo:
        return None, "No Aplica / Sin Contacto", {}

    # D3: Salud (20%)
    d3_score = 0.0
    patologia = get_val(['presenta_patologia', '14) ¿Presenta alguna patología de salud?:'])
    discapacidad = get_val(['discapacidad_aplica', '18) ¿Presenta alguna Discapacidad?:'])
    if patologia in ['sí', 'si']: 
        d3_score += 50.0
    if discapacidad in ['sí', 'si']: 
        d3_score += 50.0
    d3_score = min(d3_score, 100.0)

    # D4: Social / RSH (20%)
    d4_score = 0.0
    rsh = get_val(['tramo_rsh', '10) Tramo del RSH que se encuentra la persona mayor:'])
    if '40%' in rsh: d4_score += 100.0
    elif '50%' in rsh: d4_score += 85.0
    elif '60%' in rsh: d4_score += 70.0
    elif '70%' in rsh: d4_score += 55.0
    elif '80%' in rsh: d4_score += 35.0
    elif '90%' in rsh: d4_score += 20.0
    else: d4_score += 10.0
    d4_score = min(d4_score, 100.0)

    # D6: Vivienda (20%)
    d6_score = 0.0
    estado_viv = get_val(['estado_vivienda', '40) ¿Cómo considera el estado general de su vivienda?:'])
    if 'muy malo' in estado_viv or 'malo' in estado_viv: 
        d6_score += 70.0
    elif 'regular' in estado_viv: 
        d6_score += 35.0
    
    alcantarillado = get_val(['alcantarillado_problemas', '39) ¿Tienes algún problema de obstrucción, rebalse o filtración en el sistema de alcantarillado?  '])
    if alcantarillado in ['sí', 'si']: 
        d6_score += 30.0
    d6_score = min(d6_score, 100.0)

    # D5: Participación Comunitaria (10%)
    d5_score = 0.0
    prog_social = get_val(['programa_social', '50) ¿Participa de algún Programa Social o Municipal?:'])
    if prog_social == 'no': 
        d5_score += 100.0

    # Ponderación Global Oficial según Matriz IVPM
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