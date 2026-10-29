import React, { useState } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import './NuevaEncuesta.css';

export default function NuevaEncuesta() {
  const [formData, setFormData] = useState({
    // A. Encuestador
    encuestador_nombre: 'José Martínez',
    encuestador_depto: 'DIDECO - La Granja',
    
    // B. Territorial
    direccion: '',
    villa: 'Villa San Gregorio',
    villa_otro: '',
    info_ubicacion: '',
    
    // C. Hallazgo
    hallazgo: 'Se encuentra en la vivienda el/la adulto(a) mayor y acepta participar',
    
    // D. Cuidador
    cuidador_nombre: '',
    cuidador_telefono: '',
    cuidador_vinculo: '',
    
    // E. Antecedentes Generales
    pm_nombre: '',
    pm_rut: '',
    pm_telefono: '',
    contacto_emergencia: '',
    edad: '',
    genero: 'Femenino',
    nacionalidad: 'Chilena',
    pueblo_originario_aplica: 'No',
    pueblo_originario: '',
    tramo_rsh: '0% al 40%',

    // F. Salud
    salud_centro_aplica: 'Sí',
    salud_centro_nombre: '',
    salud_centro_comuna: 'La Granja',
    patologias: [],
    patologias_tratamiento: 'Sí, todas están en tratamientos',
    vacunas: [],
    discapacidad_aplica: 'No',
    discapacidad_tipo: '',
    discapacidad_credencial: 'No y no he iniciado el trámite',
    discapacidad_porcentaje: '',
    ayuda_tecnica_aplica: 'No necesita ayuda técnica',
    ayuda_tecnica_detalle: '',

    // G. Redes de Apoyo
    convivientes_cantidad: '1',
    convive_con: [],
    vive_otra_pm: 'No',
    vive_otra_pm_vinculo: [],
    cuida_a_otro: 'No',
    cuida_a_otro_detalle: [],
    cuidador_credencial: 'No y no he iniciado el trámite',
    recibe_cuidados: 'No',
    recibe_cuidados_quien: [],
    frecuencia_visitas: 'Diario',

    // H. Vivienda
    situacion_habitacional: 'Propietario(a)',
    cubierta_vivienda: [],
    material_predominante: 'Solido',
    revision_electrica: 'Entre 1 y 5 años',
    alcantarillado_sistema: 'Individual',
    alcantarillado_problemas: 'No',
    estado_vivienda: 'Bueno',
    alimentacion_frecuencia: '3 veces al día',
    alimentacion_detalle: '',
    calefaccion: 'Estufa a gas',

    // I. Laboral / Ocupacional
    trabaja_actualmente: 'No',
    trabajo_ocupacion: '',
    trabajo_ingreso: '',
    pensionado: 'Sí',
    pension_tipo: ['PGU'],
    pension_monto: '',

    // J. Comunitario
    programa_social: 'No',
    programa_social_detalle: '',
    organizacion_participa: 'No',
    organizacion_detalle: '',
    talleres_actividades: [],

    // K. Observaciones
    observaciones: ''
  });

  const [mensajeEnvio, setMensajeEnvio] = useState('');

  // Controlar si la encuesta es completa o solo de hallazgo no presencial / rechazo
  const hallazgoAcepta = formData.hallazgo.includes('acepta participar') || formData.hallazgo.includes('oficina de DIDECO');
  const hallazgoCuidador = formData.hallazgo.includes('cuidador(a) responderá');
  const encuestaCompleta = hallazgoAcepta || hallazgoCuidador;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroup = (category, value) => {
    setFormData(prev => {
      const list = prev[category];
      if (list.includes(value)) {
        return { ...prev, [category]: list.filter(item => item !== value) };
      } else {
        return { ...prev, [category]: [...list, value] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMensajeEnvio('✅ Encuesta guardada exitosamente en la base de datos.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMensajeEnvio('⚠️ Ocurrió un problema al guardar la encuesta.');
      }
    } catch (err) {
      setMensajeEnvio('❌ Error de conexión con el servidor Flask.');
    }
  };

  return (
    <div className="encuesta-container">
      <Navbar usuario="José" />

      <main className="encuesta-main">
        <div className="encuesta-card">
          <div className="encuesta-header">
            <h2>ENCUESTA COMUNAL DE PERSONAS MAYORES 2026</h2>
            <p>Ilustre Municipalidad de La Granja — DIDECO</p>
          </div>

          {mensajeEnvio && <div className="encuesta-alert">{mensajeEnvio}</div>}

          <form onSubmit={handleSubmit} className="encuesta-form">
            
            {/* SECCIÓN A: ENCUESTADOR */}
            <fieldset className="seccion-fieldset">
              <legend>A.- IDENTIFICACIÓN DEL ENCUESTADOR(A)</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label>1) Nombre y Apellido del Encuestador(a): *</label>
                  <input type="text" name="encuestador_nombre" value={formData.encuestador_nombre} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>2) Unidad o departamento que trabaja:</label>
                  <input type="text" name="encuestador_depto" value={formData.encuestador_depto} onChange={handleChange} />
                </div>
              </div>
            </fieldset>

            {/* SECCIÓN B: TERRITORIAL */}
            <fieldset className="seccion-fieldset">
              <legend>B.- IDENTIFICACIÓN TERRITORIAL</legend>
              <div className="form-grid">
                <div className="form-group full">
                  <label>1) Escribir dirección completa: *</label>
                  <input type="text" name="direccion" placeholder="Ej: Av. Américo Vespucio #00500" value={formData.direccion} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>3) Seleccionar Villa o Población: *</label>
                  <select name="villa" value={formData.villa} onChange={handleChange}>
                    <option value="Villa San Gregorio">Villa San Gregorio</option>
                    <option value="Villa Las Dalias I">Villa Las Dalias I</option>
                    <option value="Villa Las Dalias II">Villa Las Dalias II</option>
                    <option value="Villa Nueva San Gregorio">Villa Nueva San Gregorio</option>
                    <option value="Condominio Marcela Casanueva">Condominio Marcela Casanueva</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                {formData.villa === 'Otro' && (
                  <div className="form-group">
                    <label>Especificar Villa/Población:</label>
                    <input type="text" name="villa_otro" value={formData.villa_otro} onChange={handleChange} />
                  </div>
                )}
                <div className="form-group full">
                  <label>4) Información complementaria de la ubicación:</label>
                  <input type="text" name="info_ubicacion" placeholder="Ej: Block, departamento, portón azul" value={formData.info_ubicacion} onChange={handleChange} />
                </div>
              </div>
            </fieldset>

            {/* SECCIÓN C: HALLAZGO */}
            <fieldset className="seccion-fieldset depto-destacado">
              <legend>C.- SITUACIÓN AL MOMENTO DE LA VISITA</legend>
              <div className="form-group full">
                <label>5) Hallazgo/Situación de la Persona Mayor: *</label>
                <select name="hallazgo" value={formData.hallazgo} onChange={handleChange} className="select-hallazgo">
                  <option value="Se encuentra en la vivienda el/la adulto(a) mayor y acepta participar">Se encuentra en la vivienda el/la adulto(a) mayor y acepta participar</option>
                  <option value="Se encuentra en la vivienda el/la adulto(a) mayor y su cuidador(a) responderá.">Se encuentra en la vivienda el/la adulto(a) mayor y su cuidador(a) responderá.</option>
                  <option value="Se encuentra en la vivienda pero no desea participar.">Se encuentra en la vivienda pero no desea participar.</option>
                  <option value="No se encuentra en la vivienda.">No se encuentra en la vivienda.</option>
                  <option value="Persona Mayor ya no reside en la vivienda.">Persona Mayor ya no reside en la vivienda.</option>
                  <option value="No hay moradores (ninguna persona en el hogar)">No hay moradores (ninguna persona en el hogar)</option>
                  <option value="Persona mayor fallecida.">Persona mayor fallecida.</option>
                  <option value="Persona mayor en situación de calle, acepta participar.">Persona mayor en situación de calle, acepta participar.</option>
                  <option value="Persona mayor en situación de calle, no acepta participar.">Persona mayor en situación de calle, no acepta participar.</option>
                  <option value="Vivienda/Sector de Difícil e Imposible acceso">Vivienda/Sector de Difícil e Imposible acceso</option>
                  <option value="Encuesta aplicada en oficina de DIDECO">Encuesta aplicada en oficina de DIDECO</option>
                </select>
              </div>
            </fieldset>

            {/* SECCIÓN D: CUIDADOR (SOLO SI EL CUIDADOR RESPONDE) */}
            {hallazgoCuidador && (
              <fieldset className="seccion-fieldset cuida-bg">
                <legend>D.- ANTECEDENTES DEL CUIDADOR(A)</legend>
                <div className="form-grid">
                  <div className="form-group">
                    <label>1) Nombre completo del cuidador(a): *</label>
                    <input type="text" name="cuidador_nombre" value={formData.cuidador_nombre} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>2) Teléfono del cuidador(a): *</label>
                    <input type="text" name="cuidador_telefono" value={formData.cuidador_telefono} onChange={handleChange} required />
                  </div>
                  <div className="form-group full">
                    <label>3) Vínculo o relación con la persona mayor: *</label>
                    <select name="cuidador_vinculo" value={formData.cuidador_vinculo} onChange={handleChange}>
                      <option value="">Seleccione vínculo...</option>
                      <option value="Hijo(a) / Hijastro(a)">Hijo(a) / Hijastro(a)</option>
                      <option value="Cónyuge">Cónyuge</option>
                      <option value="Conviviente">Conviviente</option>
                      <option value="Nieto(a)">Nieto(a)</option>
                      <option value="Hermano(a)">Hermano(a)</option>
                      <option value="Cuidador(a) remunerado/ informal NO familiar">Cuidador(a) remunerado/ informal NO familiar</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            )}

            {/* SI SE PUEDE APLICAR LA ENCUESTA COMPLETA */}
            {encuestaCompleta ? (
              <>
                {/* SECCIÓN E: GENERALES */}
                <fieldset className="seccion-fieldset">
                  <legend>E.- ANTECEDENTES GENERALES DEL ADULTO(A) MAYOR</legend>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label>1) Nombre Completo de la persona mayor: *</label>
                      <input type="text" name="pm_nombre" value={formData.pm_nombre} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>2) RUT de la persona mayor:</label>
                      <input type="text" name="pm_rut" placeholder="12345678-K" value={formData.pm_rut} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>3) Teléfono de la persona mayor:</label>
                      <input type="text" name="pm_telefono" value={formData.pm_telefono} onChange={handleChange} />
                    </div>
                    <div className="form-group full">
                      <label>4) Contacto de Emergencia (Teléfono, Nombre, Vínculo):</label>
                      <input type="text" name="contacto_emergencia" placeholder="Ej: +56912345678, Karen Lagos, Hija" value={formData.contacto_emergencia} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>5) Edad: *</label>
                      <input type="number" name="edad" min="50" max="115" value={formData.edad} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>6) Género: *</label>
                      <select name="genero" value={formData.genero} onChange={handleChange}>
                        <option value="Femenino">Femenino</option>
                        <option value="Masculino">Masculino</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>7) Nacionalidad: *</label>
                      <select name="nacionalidad" value={formData.nacionalidad} onChange={handleChange}>
                        <option value="Chilena">Chilena</option>
                        <option value="Peruana">Peruana</option>
                        <option value="Haitiana">Haitiana</option>
                        <option value="Venezolana">Venezolana</option>
                        <option value="Colombiana">Colombiana</option>
                        <option value="Otra">Otra</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>8) ¿Pertenece a un pueblo originario?: *</label>
                      <select name="pueblo_originario_aplica" value={formData.pueblo_originario_aplica} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>
                    {formData.pueblo_originario_aplica === 'Sí' && (
                      <div className="form-group">
                        <label>Pueblo Originario:</label>
                        <input type="text" name="pueblo_originario" placeholder="Ej: Mapuche, Aymara" value={formData.pueblo_originario} onChange={handleChange} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>10) Tramo del RSH: *</label>
                      <select name="tramo_rsh" value={formData.tramo_rsh} onChange={handleChange}>
                        <option value="0% al 40%">0% al 40%</option>
                        <option value="41% al 50%">41% al 50%</option>
                        <option value="51% al 60%">51% al 60%</option>
                        <option value="61% al 70%">61% al 70%</option>
                        <option value="71% al 80%">71% al 80%</option>
                        <option value="81% al 90%">81% al 90%</option>
                        <option value="91% al 100%">91% al 100%</option>
                        <option value="No tiene/ No sabe">No tiene/ No sabe</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* SECCIÓN F: SALUD */}
                <fieldset className="seccion-fieldset">
                  <legend>F.- ANTECEDENTES DE SALUD Y FUNCIONALIDAD</legend>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>11) ¿Se atiende en algún Centro de Salud?: *</label>
                      <select name="salud_centro_aplica" value={formData.salud_centro_aplica} onChange={handleChange}>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    {formData.salud_centro_aplica === 'Sí' && (
                      <>
                        <div className="form-group">
                          <label>12) Centro de Salud:</label>
                          <input type="text" name="salud_centro_nombre" placeholder="Ej: CESFAM San Rafael" value={formData.salud_centro_nombre} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label>13) Comuna del Centro de Salud:</label>
                          <input type="text" name="salud_centro_comuna" value={formData.salud_centro_comuna} onChange={handleChange} />
                        </div>
                      </>
                    )}
                    
                    <div className="form-group full">
                      <label>15) Patologías que presenta (Marcar todas las que apliquen):</label>
                      <div className="checkbox-grid">
                        {['Hipertensión Arterial', 'Diabetes Mellitus tipo 2', 'Dislipidemia', 'Artrosis', 'Osteoporosis', 'Artritis', 'Demencia y Alzheimer', 'Parkinson', 'EPOC'].map(p => (
                          <label key={p} className="checkbox-label">
                            <input type="checkbox" checked={formData.patologias.includes(p)} onChange={() => handleCheckboxGroup('patologias', p)} />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>18) ¿Presenta alguna Discapacidad?: *</label>
                      <select name="discapacidad_aplica" value={formData.discapacidad_aplica} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.discapacidad_aplica === 'Sí' && (
                      <div className="form-group">
                        <label>19) Tipo de Discapacidad:</label>
                        <select name="discapacidad_tipo" value={formData.discapacidad_tipo} onChange={handleChange}>
                          <option value="Física">Física</option>
                          <option value="Sensorial (Auditiva)">Sensorial (Auditiva)</option>
                          <option value="Sensorial (Visual)">Sensorial (Visual)</option>
                          <option value="Intelectual">Intelectual</option>
                          <option value="Psíquica/ Mental">Psíquica/ Mental</option>
                          <option value="Múltiple">Múltiple</option>
                        </select>
                      </div>
                    )}
                  </div>
                </fieldset>
              </>
            ) : null}

            {/* SECCIÓN K: OBSERVACIONES FINALES */}
            <fieldset className="seccion-fieldset">
              <legend>K.- OBSERVACIONES Y REGISTRO FINAL</legend>
              <div className="form-group full">
                <label>55) Registrar información adicional relevante o motivo de no respuesta: *</label>
                <textarea 
                  name="observaciones" 
                  rows="4" 
                  value={formData.observaciones} 
                  onChange={handleChange}
                  placeholder="Detallar condiciones de salud observadas, accesibilidad, motivo si no aceptó participar, etc."
                />
              </div>
            </fieldset>

            <div className="encuesta-actions">
              <button type="submit" className="btn-guardar-encuesta">
                💾 Guardar Encuesta 2026
              </button>
            </div>

          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}