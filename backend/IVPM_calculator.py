import re


def _normalizar_texto(valor):
    if valor is None:
        return ""
    if isinstance(valor, list):
        return ", ".join(str(x).strip().lower() for x in valor if x is not None)
    return str(valor).strip().lower()


def _es_no_puntuable(txt):
    if not txt:
        return True
    patrones_nulos = [
        "no sabe",
        "no responde",
        "no contesta",
        "no recuerdo",
        "no recuerda",
        "sin información",
        "sin informacion",
        "no aplica",
        "nan",
        "none",
    ]
    return any(p in txt for p in patrones_nulos)


def calcular_ivpm_registro(row):
    """
    Calcula el IVPM global y por dimensión según la Propuesta Metodológica
    de la I. Municipalidad de La Granja (DIDECO 2026).

    Etapa 1: Cada indicador válido se transforma a escala 0 - 100 y se pondera
             internamente dentro de su dimensión (omitiendo indicadores no puntuables).
    Etapa 2: Se calcula el promedio ponderado global (0 - 100) entre las dimensiones
             con información válida y se clasifica en los 4 tramos oficiales.

    Retorna: (puntaje_global, nivel_riesgo, detalle_dimensiones)
    """
    if not isinstance(row, dict):
        return None, "Sin evaluar", {}

    # Busca primero por llaves exactas (case-insensitive) y luego por subcadenas en encabezados Excel
    row_lower = {str(k).strip().lower(): v for k, v in row.items()}

    def get_raw(exact_keys, contains_patterns=None):
        for k in exact_keys:
            kl = k.lower()
            if kl in row_lower and row_lower[kl] is not None and str(row_lower[kl]).strip() != "":
                return row_lower[kl]
        if contains_patterns:
            for pat in contains_patterns:
                pat_l = pat.lower()
                for rk, rv in row_lower.items():
                    if pat_l in rk and rv is not None and str(rv).strip() != "":
                        return rv
        return None

    def get_val(exact_keys, contains_patterns=None):
        return _normalizar_texto(get_raw(exact_keys, contains_patterns))

    # =========================================================================
    # DIMENSIÓN 2: SITUACIÓN AL MOMENTO DE LA VISITA (Filtro de admisibilidad)
    # =========================================================================
    hallazgo = get_val(
        ["hallazgo", "situacion_visita"],
        ["hallazgo", "situación de la persona mayor", "situacion de la persona mayor"],
    )
    estados_no_admisibles = [
        "no se encuentra",
        "no hay moradores",
        "fallecida",
        "no acepta participar",
        "no desean participar",
        "difícil acceso",
        "dificil acceso",
        "no vive ninguna persona mayor",
    ]
    if any(est in hallazgo for est in estados_no_admisibles):
        return None, "Sin evaluar", {}

    def promedio_ponderado(items_peso_valor):
        """items_peso_valor: lista de tuplas (peso, valor_0_a_100_o_None)."""
        validos = [(p, v) for (p, v) in items_peso_valor if v is not None]
        if not validos:
            return None
        suma_pesos = sum(p for p, _ in validos)
        if suma_pesos <= 0:
            return None
        return round(sum(p * v for p, v in validos) / suma_pesos, 2)

    # =========================================================================
    # DIMENSIÓN 4: SOCIAL (Peso Global: 15% | 4 indicadores al 25% c/u)
    # =========================================================================
    # 4.1 Tramo del RSH (25%)
    rsh_raw = get_val(
        ["rsh", "tramo_rsh", "rsh_tramo", "registro_social_hogares", "calificacion_socioeconomica"],
        ["tramo del rsh", "registro social", "rsh"],
    )
    rsh_tiene = get_val(["rsh_aplica", "tiene_rsh", "rsh_tiene"], ["cuenta con rsh", "tiene rsh"])

    s_rsh = None
    if rsh_raw:
        if "40%" in rsh_raw or "0%" in rsh_raw:
            s_rsh = 100.0
        elif "50%" in rsh_raw or "41%" in rsh_raw:
            s_rsh = 85.0
        elif "60%" in rsh_raw or "51%" in rsh_raw:
            s_rsh = 70.0
        elif "70%" in rsh_raw or "61%" in rsh_raw:
            s_rsh = 55.0
        elif "80%" in rsh_raw or "71%" in rsh_raw:
            s_rsh = 35.0
        elif "90%" in rsh_raw or "81%" in rsh_raw:
            s_rsh = 20.0
        elif "100%" in rsh_raw or "91%" in rsh_raw:
            s_rsh = 10.0
        elif "no tiene" in rsh_raw or "no sabe" in rsh_raw or rsh_raw == "no":
            s_rsh = 0.0
    elif rsh_tiene in ["no", "no tiene", "no sabe"]:
        s_rsh = 0.0

    # 4.2 Frecuencia de alimentación (25%)
    alim_freq = get_val(
        ["alimentacion_frecuencia", "frecuencia_alimentacion"],
        ["cuántas veces al día se alimenta", "cuantas veces al dia se alimenta", "frecuencia de alimentación"],
    )
    s_alim_freq = None
    if alim_freq and not _es_no_puntuable(alim_freq):
        if "1" in alim_freq or "una" in alim_freq:
            s_alim_freq = 100.0
        elif "2" in alim_freq or "dos" in alim_freq:
            s_alim_freq = 60.0
        elif "3" in alim_freq or "tres" in alim_freq:
            s_alim_freq = 20.0
        elif "4" in alim_freq or "cuatro" in alim_freq or "más" in alim_freq or "mas" in alim_freq:
            s_alim_freq = 0.0

    # 4.3 Características / suficiencia de la alimentación (25%)
    alim_car = get_val(
        ["alimentacion_caracteristicas", "alimentacion_calidad", "alimentacion_consiste"],
        ["consiste su alimentación", "consiste su alimentacion", "calidad alimentaria"],
    )
    s_alim_car = None
    if alim_car and not _es_no_puntuable(alim_car):
        if "insuficiente" in alim_car or "falta de recursos" in alim_car:
            s_alim_car = 100.0
        elif "bajo costo" in alim_car or "limitada diversidad" in alim_car:
            s_alim_car = 60.0
        elif "poco variada" in alim_car:
            s_alim_car = 30.0
        elif "variada y suficiente" in alim_car:
            s_alim_car = 0.0

    # 4.4 Calefacción y abrigo (25%) — Si hay múltiples opciones, no se suman: se toma la mejor cobertura (mínimo riesgo)
    calef_raw = get_raw(
        ["calefaccion", "calefaccion_abrigo", "sistema_calefaccion"],
        ["calefaccionarse", "abrigarse", "calefacción", "calefaccion"],
    )
    s_calef = None
    if calef_raw is not None:
        opciones_calef = (
            [str(x).strip().lower() for x in calef_raw]
            if isinstance(calef_raw, list)
            else [x.strip().lower() for x in str(calef_raw).split(",")]
        )
        puntajes_calef = []
        for op in opciones_calef:
            if not op or _es_no_puntuable(op) or op == "otros" or op == "otro":
                continue
            if "estufa a gas" in op or "gas" in op:
                puntajes_calef.append(30.0)
            elif "parafina" in op:
                puntajes_calef.append(30.0)
            elif "frazada" in op:
                puntajes_calef.append(50.0)
            elif "no cuenta" in op or "ninguna" in op:
                puntajes_calef.append(100.0)
        if puntajes_calef:
            s_calef = min(puntajes_calef)

    d4_social = promedio_ponderado([
        (0.25, s_rsh),
        (0.25, s_alim_freq),
        (0.25, s_alim_car),
        (0.25, s_calef),
    ])

    # =========================================================================
    # DIMENSIÓN 5: ANTECEDENTES DE SALUD (Peso Global: 15%)
    # 5.1 Acceso (15%) | 5.2 Morbilidad (20%) | 5.3 Tratamiento (20%)
    # 5.4 Vacunación (10%) | 5.5 Discapacidad (15%) | 5.6 Ayudas técnicas (20%)
    # =========================================================================
    # 5.1 Acceso a servicios de salud (15%)
    centro_salud = get_val(
        ["salud_centro_nombre", "centro_salud", "inscrito_cesfam", "prevision_salud"],
        ["centro de salud", "cesfam", "previsión", "prevision"],
    )
    s_salud_acceso = None
    if centro_salud and not _es_no_puntuable(centro_salud):
        if centro_salud in ["no", "no inscrito", "ninguno", "sin previsión", "sin prevision"]:
            s_salud_acceso = 100.0
        else:
            s_salud_acceso = 0.0

    # 5.2 Morbilidad y patologías declaradas (20%)
    patologia = get_val(
        ["presenta_patologia", "tiene_patologia"],
        ["patología de salud", "patologia de salud", "enfermedad crónica", "enfermedad cronica"],
    )
    s_salud_morb = None
    if patologia and not _es_no_puntuable(patologia):
        if patologia in ["sí", "si"] or patologia.startswith("sí") or patologia.startswith("si,"):
            s_salud_morb = 100.0
        elif patologia == "no" or "ninguna" in patologia:
            s_salud_morb = 0.0

    # 5.3 Continuidad del tratamiento (20%)
    tratamiento = get_val(
        ["patologias_tratamiento", "continuidad_tratamiento", "en_tratamiento"],
        ["en tratamiento", "tratamiento médico", "tratamiento medico"],
    )
    s_salud_trat = None
    if tratamiento and not _es_no_puntuable(tratamiento):
        if "no aplica" in tratamiento or tratamiento.startswith("sí") or tratamiento.startswith("si"):
            s_salud_trat = 0.0
        elif "algunas" in tratamiento or "parcial" in tratamiento:
            s_salud_trat = 50.0
        elif tratamiento == "no" or tratamiento.startswith("no,"):
            s_salud_trat = 100.0

    # 5.4 Prevención y vacunación (10%)
    vacunas = get_val(
        ["vacunacion", "vacunas", "vacuna_al_dia"],
        ["vacuna", "vacunación", "vacunacion"],
    )
    s_salud_vac = None
    if vacunas and not _es_no_puntuable(vacunas):
        if vacunas.startswith("sí") or vacunas.startswith("si") or "al día" in vacunas or "al dia" in vacunas:
            s_salud_vac = 0.0
        elif "algunas" in vacunas or "parcial" in vacunas:
            s_salud_vac = 50.0
        elif vacunas == "no" or "ninguna" in vacunas:
            s_salud_vac = 100.0

    # 5.5 Discapacidad y acreditación (15%)
    discapacidad = get_val(
        ["discapacidad_aplica", "presenta_discapacidad"],
        ["alguna discapacidad", "presenta discapacidad"],
    )
    credencial_disc = get_val(
        ["discapacidad_credencial", "credencial_discapacidad"],
        ["credencial de discapacidad", "posee credencial"],
    )
    s_salud_disc = None
    if discapacidad and not _es_no_puntuable(discapacidad):
        if discapacidad == "no":
            s_salud_disc = 0.0
        elif discapacidad in ["sí", "si"] or discapacidad.startswith("sí") or discapacidad.startswith("si"):
            if credencial_disc.startswith("sí") or credencial_disc.startswith("si"):
                s_salud_disc = 50.0
            elif "trámite" in credencial_disc or "tramite" in credencial_disc:
                s_salud_disc = 75.0
            else:
                s_salud_disc = 100.0

    # 5.6 Ayudas técnicas (20%)
    ayuda_tec = get_val(
        ["ayuda_tecnica_aplica", "ayuda_tecnica"],
        ["ayuda técnica", "ayuda tecnica"],
    )
    s_salud_ayuda = None
    if ayuda_tec and not _es_no_puntuable(ayuda_tec):
        if ayuda_tec == "no" or "no requiere" in ayuda_tec:
            s_salud_ayuda = 0.0
        elif "requiere y no" in ayuda_tec or "necesita y no" in ayuda_tec:
            s_salud_ayuda = 100.0
        elif ayuda_tec.startswith("sí") or ayuda_tec.startswith("si"):
            s_salud_ayuda = 50.0

    d5_salud = promedio_ponderado([
        (0.15, s_salud_acceso),
        (0.20, s_salud_morb),
        (0.20, s_salud_trat),
        (0.10, s_salud_vac),
        (0.15, s_salud_disc),
        (0.20, s_salud_ayuda),
    ])

    # =========================================================================
    # DIMENSIÓN 6: VIVIENDA Y HABITABILIDAD (Peso Global: 15%)
    # 6.1 Tenencia (15%) | 6.2 Materialidad (20%) | 6.3 Eléctrica (25%)
    # 6.4 Alcantarillado (20%) | 6.5 Conservación (20%)
    # =========================================================================
    # 6.1 Seguridad de la tenencia habitacional (Max = 2)
    tenencia = get_val(
        ["situacion_habitacional", "tenencia_vivienda"],
        ["situación habitacional", "situacion habitacional"],
    )
    s_viv_tenencia = None
    if tenencia and not _es_no_puntuable(tenencia) and tenencia != "otro":
        if "cedida" in tenencia or "allegado" in tenencia or "calle" in tenencia:
            s_viv_tenencia = (2.0 / 2.0) * 100.0
        elif any(t in tenencia for t in ["deuda", "arrendatario", "usufructo", "herencia", "copropiedad"]):
            s_viv_tenencia = (1.0 / 2.0) * 100.0
        elif "propietario" in tenencia:
            s_viv_tenencia = 0.0

    # 6.2 Materialidad de la vivienda (Max = 1)
    material = get_val(
        ["material_predominante", "material_vivienda"],
        ["material predominante"],
    )
    s_viv_material = None
    if material and not _es_no_puntuable(material):
        if "sólido" in material or "solido" in material:
            s_viv_material = 0.0
        elif "madera" in material or "mixto" in material:
            s_viv_material = 100.0

    # 6.3 Seguridad de las instalaciones eléctricas (Max = 3)
    electrica = get_val(
        ["revision_electrica", "sistema_electrico"],
        ["revisión al sistema eléctrico", "revision al sistema electrico", "sistema eléctrico"],
    )
    s_viv_electrica = None
    if electrica and not _es_no_puntuable(electrica):
        if "menos de 1" in electrica:
            s_viv_electrica = (0.0 / 3.0) * 100.0
        elif "entre 1 y 5" in electrica or "1 y 5" in electrica:
            s_viv_electrica = (1.0 / 3.0) * 100.0
        elif "más de 5" in electrica or "mas de 5" in electrica:
            s_viv_electrica = (2.0 / 3.0) * 100.0
        elif "nunca" in electrica:
            s_viv_electrica = (3.0 / 3.0) * 100.0

    # 6.4 Sistema de alcantarillado y saneamiento (Max = 3; se toma el mayor puntaje de sus 2 indicadores)
    alc_tipo = get_val(
        ["alcantarillado_tipo", "sistema_alcantarillado"],
        ["cómo es el sistema de alcantarillado", "como es el sistema de alcantarillado"],
    )
    alc_prob = get_val(
        ["alcantarillado_problemas", "problemas_alcantarillado"],
        ["obstrucción, rebalse o filtración", "obstruccion, rebalse o filtracion"],
    )
    pts_alc = []
    if alc_tipo and not _es_no_puntuable(alc_tipo):
        if "compartido" in alc_tipo:
            pts_alc.append(1.0)
        elif "individual" in alc_tipo:
            pts_alc.append(0.0)
    if alc_prob and not _es_no_puntuable(alc_prob):
        if alc_prob in ["sí", "si"] or alc_prob.startswith("sí") or alc_prob.startswith("si"):
            pts_alc.append(3.0)
        elif alc_prob == "no":
            pts_alc.append(0.0)
    s_viv_alcantarillado = (max(pts_alc) / 3.0) * 100.0 if pts_alc else None

    # 6.5 Estado general de conservación de la vivienda (Max = 3)
    estado_viv = get_val(
        ["estado_vivienda", "conservacion_vivienda"],
        ["estado general de su vivienda", "estado general de la vivienda"],
    )
    s_viv_estado = None
    if estado_viv and not _es_no_puntuable(estado_viv):
        if "muy malo" in estado_viv or "inhabitable" in estado_viv:
            s_viv_estado = (3.0 / 3.0) * 100.0
        elif "malo" in estado_viv:
            s_viv_estado = (2.0 / 3.0) * 100.0
        elif "regular" in estado_viv:
            s_viv_estado = (1.0 / 3.0) * 100.0
        elif "bueno" in estado_viv:
            s_viv_estado = 0.0

    d6_vivienda = promedio_ponderado([
        (0.15, s_viv_tenencia),
        (0.20, s_viv_material),
        (0.25, s_viv_electrica),
        (0.20, s_viv_alcantarillado),
        (0.20, s_viv_estado),
    ])

    # =========================================================================
    # DIMENSIÓN 7: PARTICIPACIÓN COMUNITARIA (Peso Global: 10%)
    # D7.1 Programas (30%) | D7.2 Organizaciones (35%) | D7.3 Talleres (35%)
    # =========================================================================
    # D7.1 Vinculación con programas sociales o municipales (30%)
    prog_social = get_val(
        ["programa_social", "participa_programa"],
        ["programa social o municipal"],
    )
    s_com_prog = None
    if prog_social and not _es_no_puntuable(prog_social):
        if prog_social.startswith("sí") or prog_social.startswith("si"):
            s_com_prog = 0.0
        elif prog_social == "no":
            s_com_prog = 100.0

    # D7.2 Participación en organizaciones comunitarias (35%)
    org_com = get_val(
        ["organizacion_comunitaria", "participa_organizacion"],
        ["organización comunitaria", "organizacion comunitaria"],
    )
    s_com_org = None
    if org_com and not _es_no_puntuable(org_com):
        if org_com.startswith("sí") or org_com.startswith("si"):
            s_com_org = 0.0
        elif org_com == "no" or "no participa" in org_com:
            s_com_org = 100.0

    # D7.3 Participación en talleres y actividades comunitarias (35%)
    talleres = get_val(
        ["talleres_comunitarios", "actividades_comunitarias", "asiste_talleres"],
        ["talleres o actividades comunitarias", "actividades comunitarias"],
    )
    s_com_talleres = None
    if talleres and not _es_no_puntuable(talleres):
        if "no participa" in talleres or talleres in ["no", "ninguna", "ninguno"]:
            s_com_talleres = 100.0
        else:
            s_com_talleres = 0.0

    d7_comunitaria = promedio_ponderado([
        (0.30, s_com_prog),
        (0.35, s_com_org),
        (0.35, s_com_talleres),
    ])

    # =========================================================================
    # DIMENSIÓN 8: ANTECEDENTES REDES DE APOYO (Peso Global: 15%)
    # Ponderación interna proporcional al puntaje máximo de cada indicador D8.1-D8.8
    # =========================================================================
    indicadores_d8 = []  # tuplas (puntaje_obtenido, puntaje_maximo)

    # D8.1 Cantidad de personas que vive en el hogar (Max = 5)
    convivientes = get_val(
        ["convivientes_cantidad", "cantidad_personas_hogar"],
        ["cantidad de personas que vive", "personas que viven en el hogar", "convivientes"],
    )
    if convivientes and not _es_no_puntuable(convivientes):
        nums = re.findall(r"\d+", convivientes)
        if "solo" in convivientes:
            indicadores_d8.append((5.0, 5.0))
        elif "con 1 persona" in convivientes:
            indicadores_d8.append((3.0, 5.0))
        elif "2 o más" in convivientes or "2 o mas" in convivientes:
            indicadores_d8.append((0.0, 5.0))
        elif nums:
            n = int(nums[0])
            # Si viene como cantidad de convivientes (0 = vive solo, 1 = vive con 1, >=2 = 2 o más)
            if "conviviente" in row_lower and n == 0:
                indicadores_d8.append((5.0, 5.0))
            elif n <= 1:
                indicadores_d8.append((5.0, 5.0))
            elif n == 2:
                indicadores_d8.append((3.0, 5.0))
            else:
                indicadores_d8.append((0.0, 5.0))

    # D8.2 Con quién vive actualmente (Max = 15)
    con_quien = get_val(
        ["con_quien_vive", "convivencia_detalle"],
        ["con quién vive", "con quien vive"],
    )
    if con_quien and not _es_no_puntuable(con_quien):
        if "solo" in con_quien:
            indicadores_d8.append((15.0, 15.0))
        elif "no familiar" in con_quien:
            indicadores_d8.append((10.0, 15.0))
        elif "cónyuge" in con_quien or "conyuge" in con_quien or "conviviente" in con_quien or "padre" in con_quien or "madre" in con_quien:
            indicadores_d8.append((5.0, 15.0))
        elif "sobrino" in con_quien or "otros familiares" in con_quien:
            indicadores_d8.append((3.0, 15.0))
        elif "nieto" in con_quien or "bisnieto" in con_quien or "hermano" in con_quien:
            indicadores_d8.append((2.0, 15.0))
        elif "hijo" in con_quien:
            indicadores_d8.append((0.0, 15.0))

    # D8.3 En su hogar vive otra persona de 60 años o más (Max = 3)
    otra_60 = get_val(
        ["otra_persona_60", "vive_otro_mayor"],
        ["otra persona de 60", "persona mayor de 60"],
    )
    if otra_60 and not _es_no_puntuable(otra_60):
        if otra_60.startswith("sí") or otra_60.startswith("si"):
            indicadores_d8.append((0.0, 3.0))
        elif otra_60 == "no":
            indicadores_d8.append((3.0, 3.0))

    # D8.4 Actualmente cuida o apoya de manera permanente a otra persona (Max = 10)
    cuida_otro = get_val(
        ["cuida_persona", "cuidador_permanente", "cuida_a_alguien"],
        ["cuida o apoya de manera permanente"],
    )
    es_cuidador_permanente = False
    if cuida_otro and not _es_no_puntuable(cuida_otro):
        if cuida_otro.startswith("sí") or cuida_otro.startswith("si"):
            indicadores_d8.append((10.0, 10.0))
            es_cuidador_permanente = True
        elif cuida_otro == "no":
            indicadores_d8.append((0.0, 10.0))

    # D8.5 Gestionó Credencial Cuidador(a) (Max = 5) — Solo aplica si D8.4 == Sí
    if es_cuidador_permanente:
        cred_cuidador = get_val(
            ["credencial_cuidador", "gestiono_credencial_cuidador"],
            ["credencial cuidador"],
        )
        if cred_cuidador and not _es_no_puntuable(cred_cuidador):
            if cred_cuidador.startswith("sí") or cred_cuidador.startswith("si"):
                indicadores_d8.append((0.0, 5.0))
            elif cred_cuidador == "no":
                indicadores_d8.append((5.0, 5.0))

    # D8.6 Recibe ayuda o cuidados de alguna persona para actividades diarias (Max = 5)
    recibe_cuidados = get_val(
        ["recibe_cuidados", "recibe_ayuda"],
        ["recibe ayuda o cuidados"],
    )
    recibe_cuidados_si = False
    if recibe_cuidados and not _es_no_puntuable(recibe_cuidados):
        if recibe_cuidados.startswith("sí") or recibe_cuidados.startswith("si"):
            indicadores_d8.append((0.0, 5.0))
            recibe_cuidados_si = True
        elif recibe_cuidados == "no":
            indicadores_d8.append((5.0, 5.0))

    # D8.7 Quién le brinda principalmente ese apoyo o cuidado (Max = 5) — Solo aplica si D8.6 == Sí
    if recibe_cuidados_si:
        quien_cuida = get_val(
            ["recibe_cuidados_quien", "quien_brinda_cuidado"],
            ["quién le brinda principalmente", "quien le brinda principalmente"],
        )
        if quien_cuida and not _es_no_puntuable(quien_cuida):
            if "cónyuge" in quien_cuida or "conyuge" in quien_cuida or "conviviente" in quien_cuida or "hijo" in quien_cuida:
                indicadores_d8.append((0.0, 5.0))
            elif "nieto" in quien_cuida or "bisnieto" in quien_cuida or "hermano" in quien_cuida:
                indicadores_d8.append((1.0, 5.0))
            elif "sobrino" in quien_cuida or "otros familiares" in quien_cuida:
                indicadores_d8.append((2.0, 5.0))
            elif "padre" in quien_cuida or "madre" in quien_cuida:
                indicadores_d8.append((3.0, 5.0))
            elif "no familiar" in quien_cuida:
                indicadores_d8.append((5.0, 5.0))

    # D8.8 Frecuencia de visitas o contacto con familiares (Max = 30)
    freq_visitas = get_val(
        ["frecuencia_visitas", "contacto_familiares"],
        ["frecuencia de visitas", "contacto con familiares"],
    )
    if freq_visitas and not _es_no_puntuable(freq_visitas):
        if "diario" in freq_visitas:
            indicadores_d8.append((0.0, 30.0))
        elif "varias veces" in freq_visitas:
            indicadores_d8.append((3.0, 30.0))
        elif "una vez por semana" in freq_visitas or "1 vez" in freq_visitas:
            indicadores_d8.append((8.0, 30.0))
        elif "ocasionalmente" in freq_visitas:
            indicadores_d8.append((15.0, 30.0))
        elif "nunca" in freq_visitas:
            indicadores_d8.append((30.0, 30.0))

    d8_redes = None
    if indicadores_d8:
        suma_pts = sum(p for p, _ in indicadores_d8)
        suma_max = sum(m for _, m in indicadores_d8)
        if suma_max > 0:
            d8_redes = round((suma_pts / suma_max) * 100.0, 2)

    # =========================================================================
    # ETAPA 2: ÍNDICE GLOBAL NORMALIZADO (0 - 100)
    # Ponderación Oficial Tabla #1:
    # Social (15%), Salud (15%), Vivienda (15%), Comunitaria (10%), Redes (15%)
    # =========================================================================
    puntaje_global = promedio_ponderado([
        (0.15, d4_social),
        (0.15, d5_salud),
        (0.15, d6_vivienda),
        (0.10, d7_comunitaria),
        (0.15, d8_redes),
    ])

    if puntaje_global is None:
        return None, "Sin evaluar", {}

    puntaje_global = round(puntaje_global, 1)

    # Tramos Oficiales de Vulnerabilidad (La Granja 2026)
    if puntaje_global >= 75:
        nivel = "Vulnerabilidad Crítica"
    elif puntaje_global >= 50:
        nivel = "Vulnerabilidad Alta"
    elif puntaje_global >= 25:
        nivel = "Vulnerabilidad Moderada"
    else:
        nivel = "Vulnerabilidad Baja"

    dimensiones = {
        "D4_Social": d4_social,
        "D5_Salud": d5_salud,
        "D6_Vivienda": d6_vivienda,
        "D7_Comunitaria": d7_comunitaria,
        "D8_Redes_Apoyo": d8_redes,
    }

    return puntaje_global, nivel, dimensiones