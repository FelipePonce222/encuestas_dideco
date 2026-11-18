// Convierte texto Unicode a codificación compatible con fuentes estándar PDF (WinAnsi / Latin-1)
function toWinAnsi(texto) {
  return String(texto ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 32 && code <= 255) return ch;
      if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
      return '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfEscape(texto) {
  return toWinAnsi(texto)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function dividirLineas(texto, maxChars) {
  const limpio = toWinAnsi(texto);
  if (!limpio) return ['No informa'];
  const palabras = limpio.split(' ');
  const lineas = [];
  let actual = '';

  for (const palabra of palabras) {
    if (!actual) {
      actual = palabra;
    } else if (actual.length + 1 + palabra.length <= maxChars) {
      actual += ' ' + palabra;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export function descargarFichaPdf(vecino) {
  const d = vecino?.encuesta_detalle || {};
  const fechaEmision = new Date().toLocaleDateString('es-CL');

  const paginas = [[]];
  let y = 760;

  const nuevaPagina = () => {
    paginas.push([]);
    y = 780;
  };

  const verificarSalto = (alturaNecesaria = 24) => {
    if (y - alturaNecesaria < 55) {
      nuevaPagina();
    }
  };

  const escribirTexto = (texto, x, posY, { bold = false, size = 10, color = '0.18 0.22 0.28' } = {}) => {
    const font = bold ? '/F2' : '/F1';
    paginas[paginas.length - 1].push(
      `BT ${color} rg ${font} ${size} Tf 1 0 0 1 ${x} ${posY} Tm (${pdfEscape(texto)}) Tj ET`
    );
  };

  const dibujarRect = (x, posY, w, h, fillColor) => {
    paginas[paginas.length - 1].push(`${fillColor} rg ${x} ${posY} ${w} ${h} re f`);
  };

  const dibujarLinea = (x1, y1, x2, y2, strokeColor = '0.80 0.84 0.88') => {
    paginas[paginas.length - 1].push(`${strokeColor} RG 0.8 w ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const agregarSeccion = (titulo) => {
    verificarSalto(36);
    y -= 10;
    escribirTexto(titulo, 45, y, { bold: true, size: 11.5, color: '0.17 0.42 0.69' });
    y -= 5;
    dibujarLinea(45, y, 550, y, '0.75 0.82 0.90');
    y -= 15;
  };

  const agregarCampo = (etiqueta, valor) => {
    const lineas = dividirLineas(valor, 66);
    verificarSalto(lineas.length * 14 + 4);
    escribirTexto(`${etiqueta}:`, 45, y, { bold: true, size: 9.8, color: '0.15 0.18 0.22' });
    lineas.forEach((linea, idx) => {
      escribirTexto(linea, 195, y - idx * 13.5, { bold: false, size: 9.8, color: '0.22 0.26 0.31' });
    });
    y -= lineas.length * 13.5 + 4;
  };

  // Encabezado Institucional
  dibujarRect(0, 772, 595, 70, '0.24 0.59 0.21');
  escribirTexto('ILUSTRE MUNICIPALIDAD DE LA GRANJA - DIDECO', 45, 814, {
    bold: true,
    size: 13,
    color: '1 1 1'
  });
  escribirTexto('Ficha Individual de Caracterizacion Persona Mayor (IVPM 2026)', 45, 795, {
    bold: false,
    size: 10,
    color: '0.94 0.98 0.94'
  });
  escribirTexto(`Emitido: ${fechaEmision}`, 465, 795, {
    bold: false,
    size: 9,
    color: '0.94 0.98 0.94'
  });

  y = 742;

  // Nombre y Nivel de Riesgo
  escribirTexto(vecino.nombre || 'SIN NOMBRE', 45, y, { bold: true, size: 14, color: '0.10 0.13 0.18' });
  y -= 18;
  const ivpmTexto =
    vecino.ivpm_score !== null && vecino.ivpm_score !== undefined
      ? `${vecino.ivpm_score} / 100 pts`
      : 'N/A';
  escribirTexto(
    `Nivel IVPM: ${vecino.nivel_riesgo || 'Sin evaluar'}   |   Puntaje Global: ${ivpmTexto}`,
    45,
    y,
    { bold: true, size: 10.5, color: '0.75 0.22 0.17' }
  );
  y -= 12;

  // 1. Identificación General
  agregarSeccion('1. Identificacion y Ubicacion Territorial');
  agregarCampo('RUT', vecino.rut || 'SIN RUT');
  agregarCampo('Edad / Genero', `${vecino.edad ? `${vecino.edad} años` : 'No registrada'} - ${d.genero || 'No informa'}`);
  agregarCampo('Telefono', d.pm_telefono || 'No informa');
  agregarCampo('Contacto Emergencia', d.contacto_emergencia || 'No informa');
  agregarCampo('Direccion', vecino.direccion || 'No informa');
  agregarCampo('Unidad Vecinal / Villa', `${vecino.unidad_vecinal || 'No informa'}${d.villa ? ` (${d.villa})` : ''}`);
  agregarCampo('Territorio (Franja)', vecino.franja || 'No informa');
  agregarCampo('Tramo RSH', d.tramo_rsh || 'No informa');
  agregarCampo('Estado de Visita', vecino.hallazgo || 'No informa');

  // 2. Salud y Funcionalidad
  agregarSeccion('2. Antecedentes de Salud y Funcionalidad');
  agregarCampo(
    'Centro de Salud',
    d.salud_centro_nombre
      ? `${d.salud_centro_nombre} (${d.salud_centro_comuna || 'La Granja'})`
      : 'No registrado'
  );
  const patologiasTxt =
    Array.isArray(d.patologias) && d.patologias.length > 0
      ? d.patologias.join(', ')
      : 'Ninguna declarada';
  agregarCampo('Patologias', `${patologiasTxt}${d.patologias_otra ? ` (${d.patologias_otra})` : ''}`);
  agregarCampo('Tratamiento', d.patologias_tratamiento || 'No informa');
  agregarCampo(
    'Discapacidad',
    d.discapacidad_aplica === 'Sí'
      ? `${d.discapacidad_tipo || ''} - Credencial: ${d.discapacidad_credencial || 'No informa'}`
      : 'No presenta'
  );
  agregarCampo(
    'Ayuda Tecnica',
    `${d.ayuda_tecnica_aplica || 'No informa'}${d.ayuda_tecnica_detalle ? ` (${d.ayuda_tecnica_detalle})` : ''}`
  );

  // 3. Vivienda y Habitabilidad
  agregarSeccion('3. Vivienda y Entorno Habitacional');
  agregarCampo('Situacion Habitacional', d.situacion_habitacional || 'No informa');
  agregarCampo('Material Predominante', d.material_predominante || 'No informa');
  agregarCampo('Estado Vivienda', d.estado_vivienda || 'No informa');
  agregarCampo('Revision Electrica', d.revision_electrica || 'No informa');
  agregarCampo('Calefaccion', d.calefaccion || 'No informa');
  agregarCampo('Alimentacion diaria', d.alimentacion_frecuencia || 'No informa');

  // 4. Redes de Apoyo y Previsión
  agregarSeccion('4. Redes de Apoyo, Prevision y Participacion');
  agregarCampo('Convivientes en hogar', `${d.convivientes_cantidad || '1'} persona(s)`);
  agregarCampo('Frecuencia de Visitas', d.frecuencia_visitas || 'No informa');
  const cuidadoresTxt =
    Array.isArray(d.recibe_cuidados_quien) && d.recibe_cuidados_quien.length > 0
      ? ` (${d.recibe_cuidados_quien.join(', ')})`
      : '';
  agregarCampo('Recibe Cuidados', `${d.recibe_cuidados || 'No informa'}${cuidadoresTxt}`);
  const pensionTxt =
    Array.isArray(d.pension_tipo) && d.pension_tipo.length > 0 ? d.pension_tipo.join(', ') : 'No informa';
  agregarCampo('Pension', d.pensionado === 'Sí' ? pensionTxt : d.pensionado || 'No informa');
  agregarCampo(
    'Programas / Org.',
    d.programa_social === 'Sí' ? d.programa_social_detalle || 'Si participa' : 'Ninguno'
  );

  // 5. Observaciones de Campo
  agregarSeccion('5. Observaciones de Campo');
  const obs = d.observaciones || vecino.observaciones || 'Sin observaciones registradas.';
  const lineasObs = dividirLineas(`"${obs}"`, 82);
  verificarSalto(lineasObs.length * 14 + 10);
  lineasObs.forEach((linea, idx) => {
    escribirTexto(linea, 45, y - idx * 14, { bold: false, size: 10, color: '0.20 0.24 0.29' });
  });

  // Pie de página en cada hoja
  const totalPaginas = paginas.length;
  paginas.forEach((comandos, idx) => {
    comandos.push('0.82 0.85 0.88 RG 0.6 w 45 42 m 550 42 l S');
    comandos.push(
      `BT 0.45 0.50 0.55 rg /F1 8.5 Tf 1 0 0 1 45 28 Tm (Sistema de Gestion de Encuestas Personas Mayores - DIDECO La Granja) Tj ET`
    );
    comandos.push(
      `BT 0.45 0.50 0.55 rg /F1 8.5 Tf 1 0 0 1 495 28 Tm (Pagina ${idx + 1} de ${totalPaginas}) Tj ET`
    );
  });

  // Ensamblar binario PDF 1.4
  const objetos = [];
  const agregarObj = (contenido) => {
    objetos.push(contenido);
    return objetos.length;
  };

  const catalogId = agregarObj('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = agregarObj(''); // se rellena luego
  const fontRegularId = agregarObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  const fontBoldId = agregarObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  const pageIds = [];
  for (const comandos of paginas) {
    const stream = comandos.join('\n');
    const streamId = agregarObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = agregarObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${streamId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objetos[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objetos.forEach((obj, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objetos.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const nombreLimpio = (vecino.nombre || 'Vecino')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `Ficha_IVPM_${nombreLimpio}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}