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
    nacionalidad_otra: '',
    pueblo_originario_aplica: 'No',
    pueblo_originario: '',
    tramo_rsh: '0% al 40%',

    // F. Salud y Funcionalidad
    salud_centro_aplica: 'Sí',
    salud_centro_nombre: '',
    salud_centro_comuna: 'La Granja',
    presenta_patologia: 'No',
    patologias: [],
    patologias_otra: '',
    patologias_tratamiento: 'Sí, todas están en tratamientos',
    vacunas: [],
    discapacidad_aplica: 'No',
    discapacidad_tipo: 'Física',
    discapacidad_credencial: 'No y no he iniciado el trámite',
    discapacidad_porcentaje: '',
    ayuda_tecnica_aplica: 'No necesita ayuda técnica',
    ayuda_tecnica_detalle: '',

    // G. Redes de Apoyo
    convivientes_cantidad: '1',
    convive_con: [],
    convive_otro: '',
    vive_otra_pm: 'No',
    vive_otra_pm_vinculo: [],
    cuida_a_otro: 'No',
    cuida_a_otro_detalle: [],
    cuidador_credencial: 'No y no he iniciado el trámite',
    recibe_cuidados: 'No',
    recibe_cuidados_quien: [],
    frecuencia_visitas: 'Diario',

    // H. Vivienda y Habitabilidad
    situacion_habitacional: 'Propietario(a)',
    situacion_habitacional_otro: '',
    cubierta_vivienda: [],
    cubierta_otro: '',
    material_predominante: 'Solido',
    revision_electrica: 'Entre 1 y 5 años',
    alcantarillado_sistema: 'Individual',
    alcantarillado_problemas: 'No',
    estado_vivienda: 'Bueno',
    alimentacion_frecuencia: '3 veces al día',
    alimentacion_detalle: '',
    calefaccion: 'Estufa a gas',
    calefaccion_otro: '',

    // I. Laboral / Ocupacional
    trabaja_actualmente: 'No',
    trabajo_ocupacion: '',
    trabajo_ingreso: '',
    pensionado: 'Sí',
    pension_tipo: [],
    pension_otro: '',
    pension_monto: '',

    // J. Comunitario
    programa_social: 'No',
    programa_social_detalle: '',
    organizacion_participa: 'No',
    organizacion_detalle: '',
    talleres_actividades: [],
    talleres_otro: '',

    // K. Observaciones
    observaciones: ''
  });

  const [mensajeEnvio, setMensajeEnvio] = useState('');

  const hallazgoAcepta = formData.hallazgo.includes('acepta participar') || formData.hallazgo.includes('oficina de DIDECO');
  const hallazgoCuidador = formData.hallazgo.includes('cuidador(a) responderá');
  const encuestaCompleta = hallazgoAcepta || hallazgoCuidador;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxGroup = (category, value) => {
    setFormData(prev => {
      const list = prev[category] || [];
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
            
            {/* A.- ENCUESTADOR */}
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

            {/* B.- TERRITORIAL */}
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

            {/* C.- HALLAZGO */}
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

            {/* D.- CUIDADOR */}
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
                      <option value="Bisnieto(a)">Bisnieto(a)</option>
                      <option value="Hermano(a)">Hermano(a)</option>
                      <option value="Suegro(a)">Suegro(a)</option>
                      <option value="Cuñado(a)">Cuñado(a)</option>
                      <option value="Yerno/ Nuera">Yerno/ Nuera</option>
                      <option value="Sobrino(a)">Sobrino(a)</option>
                      <option value="Tío(a)">Tío(a)</option>
                      <option value="Primo(a)">Primo(a)</option>
                      <option value="Vecino(a)/ Amigo(a)">Vecino(a)/ Amigo(a)</option>
                      <option value="Otro familiar">Otro familiar</option>
                      <option value="Cuidador(a) remunerado/ informal NO familiar">Cuidador(a) remunerado/ informal NO familiar</option>
                      <option value="Profesional">Profesional (trabajador social, salud, etc.)</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            )}

            {/* SI SE PUEDE APLICAR LA ENCUESTA COMPLETA */}
            {encuestaCompleta && (
              <>
                {/* E.- GENERALES */}
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
                      <label>4) Contacto de Emergencia (Nombre, Relación, Teléfono):</label>
                      <input type="text" name="contacto_emergencia" placeholder="Ej: 934358765, Karen Lagos, Hija" value={formData.contacto_emergencia} onChange={handleChange} />
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
                        <option value="Argentina">Argentina</option>
                        <option value="Boliviana">Boliviana</option>
                        <option value="Colombiana">Colombiana</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    {formData.nacionalidad === 'Otro' && (
                      <div className="form-group">
                        <label>Especificar Nacionalidad:</label>
                        <input type="text" name="nacionalidad_otra" value={formData.nacionalidad_otra} onChange={handleChange} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>8) ¿Pertenece a un pueblo originario?: *</label>
                      <select name="pueblo_originario_aplica" value={formData.pueblo_originario_aplica} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>
                    {formData.pueblo_originario_aplica === 'Sí' && (
                      <div className="form-group">
                        <label>9) Pueblo originario:</label>
                        <select name="pueblo_originario" value={formData.pueblo_originario} onChange={handleChange}>
                          <option value="">Seleccione...</option>
                          <option value="Mapuche">Mapuche</option>
                          <option value="Aymara">Aymara</option>
                          <option value="Atacameño">Atacameño (Likan-Antai)</option>
                          <option value="Quechua">Quechua</option>
                          <option value="Diaguita">Diaguita</option>
                          <option value="Chango">Chango</option>
                          <option value="Rapa Nui">Rapa Nui</option>
                          <option value="Colla">Colla</option>
                          <option value="Kawésqar">Kawésqar</option>
                          <option value="Yagán">Yagán (Yámana)</option>
                          <option value="Selk'nam">Selk'nam</option>
                          <option value="Pueblo originario perteneciente a otro país">Pueblo originario perteneciente a otro país</option>
                        </select>
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

                {/* F.- SALUD Y FUNCIONALIDAD */}
                <fieldset className="seccion-fieldset">
                  <legend>F.- ANTECEDENTES DE SALUD</legend>
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
                          <label>12) ¿En qué centro de salud?:</label>
                          <input type="text" name="salud_centro_nombre" placeholder="Ej: CESFAM San Rafael" value={formData.salud_centro_nombre} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label>13) Comuna del Centro de Salud:</label>
                          <input type="text" name="salud_centro_comuna" value={formData.salud_centro_comuna} onChange={handleChange} />
                        </div>
                      </>
                    )}

                    <div className="form-group full">
                      <label>14) ¿Presenta alguna patología de salud?: *</label>
                      <select name="presenta_patologia" value={formData.presenta_patologia} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.presenta_patologia === 'Sí' && (
                      <>
                        <div className="form-group full">
                          <label>15) Patologías que presenta (Marcar todas las que correspondan):</label>
                          <div className="checkbox-grid">
                            {[
                              'Hipertensión Arterial',
                              'Diabetes Mellitus tipo 2',
                              'Dislipidemia',
                              'Artrosis',
                              'Osteoporosis',
                              'Artritis',
                              'Demencia y Alzheimer',
                              'Enfermedad de Parkinson',
                              'EPOC'
                            ].map(p => (
                              <label key={p} className="checkbox-label">
                                <input type="checkbox" checked={formData.patologias.includes(p)} onChange={() => handleCheckboxGroup('patologias', p)} />
                                {p}
                              </label>
                            ))}
                          </div>
                          <input type="text" name="patologias_otra" placeholder="Otra patología..." value={formData.patologias_otra} onChange={handleChange} style={{ marginTop: '0.5rem' }} />
                        </div>

                        <div className="form-group full">
                          <label>16) ¿Actualmente está tratando su(s) patología(s)?: *</label>
                          <select name="patologias_tratamiento" value={formData.patologias_tratamiento} onChange={handleChange}>
                            <option value="Sí, todas están en tratamientos">Sí, todas están en tratamientos</option>
                            <option value="Sí, pero no todas en tratamiento">Sí, pero no todas en tratamiento</option>
                            <option value="No, ninguna en tratamiento">No, ninguna en tratamiento</option>
                            <option value="No sabe/ no responde">No sabe/ no responde</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="form-group full">
                      <label>17) Dosis de vacunas aplicadas:</label>
                      <div className="checkbox-grid">
                        {[
                          'Vacuna anual contra la Influenza',
                          'Vacuna contra COVID-19',
                          'No se ha aplicado ninguna vacuna, porque no sabía',
                          'No se ha aplicado ninguna vacuna, por tiempo',
                          'No se ha aplicado por situación de salud',
                          'No se ha aplicado por temor',
                          'No le interesa vacunarse'
                        ].map(v => (
                          <label key={v} className="checkbox-label">
                            <input type="checkbox" checked={formData.vacunas.includes(v)} onChange={() => handleCheckboxGroup('vacunas', v)} />
                            {v}
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
                      <>
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
                        <div className="form-group">
                          <label>20) Credencial de Discapacidad:</label>
                          <select name="discapacidad_credencial" value={formData.discapacidad_credencial} onChange={handleChange}>
                            <option value="Sí">Sí</option>
                            <option value="No, pero se encuentra en trámite">No, pero se encuentra en trámite</option>
                            <option value="No y no he iniciado el trámite">No y no he iniciado el trámite</option>
                          </select>
                        </div>
                        {formData.discapacidad_credencial === 'Sí' && (
                          <div className="form-group">
                            <label>21) Porcentaje de discapacidad:</label>
                            <input type="text" name="discapacidad_porcentaje" placeholder="Ej: 40% o No recuerda" value={formData.discapacidad_porcentaje} onChange={handleChange} />
                          </div>
                        )}
                      </>
                    )}

                    <div className="form-group full">
                      <label>22) Ayuda Técnica: *</label>
                      <select name="ayuda_tecnica_aplica" value={formData.ayuda_tecnica_aplica} onChange={handleChange}>
                        <option value="No necesita ayuda técnica">No necesita ayuda técnica</option>
                        <option value="Sí, utiliza ayuda técnica">Sí, utiliza ayuda técnica</option>
                        <option value="No y necesita de ayuda técnica">No y necesita de ayuda técnica</option>
                      </select>
                    </div>

                    {formData.ayuda_tecnica_aplica !== 'No necesita ayuda técnica' && (
                      <div className="form-group full">
                        <label>23) ¿Cuál ayuda técnica?:</label>
                        <input type="text" name="ayuda_tecnica_detalle" placeholder="Ej: Silla de ruedas, audífonos, andador, bastón" value={formData.ayuda_tecnica_detalle} onChange={handleChange} />
                      </div>
                    )}
                  </div>
                </fieldset>

                {/* G.- REDES DE APOYO */}
                <fieldset className="seccion-fieldset">
                  <legend>G.- ANTECEDENTES REDES DE APOYO</legend>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>24) Cantidad de personas en el hogar:</label>
                      <input type="number" name="convivientes_cantidad" min="1" value={formData.convivientes_cantidad} onChange={handleChange} />
                    </div>

                    <div className="form-group full">
                      <label>25) ¿Con quién(es) vive actualmente?:</label>
                      <div className="checkbox-grid">
                        {[
                          'Vive solo/a',
                          'Cónyuge/ conviviente',
                          'Con hijo/hija',
                          'Con nietos(as)/ Bisnietos(as)',
                          'Padre/Madre',
                          'Hermano/Hermana',
                          'Sobrino/Sobrina',
                          'Con otros familiares',
                          'Con personas No familiares',
                          'No sabe/ No responde'
                        ].map(c => (
                          <label key={c} className="checkbox-label">
                            <input type="checkbox" checked={formData.convive_con.includes(c)} onChange={() => handleCheckboxGroup('convive_con', c)} />
                            {c}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>26) ¿Vive otra persona mayor de 60 años?:</label>
                      <select name="vive_otra_pm" value={formData.vive_otra_pm} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.vive_otra_pm === 'Sí' && (
                      <div className="form-group full">
                        <label>27) Vínculo con la otra persona mayor:</label>
                        <div className="checkbox-grid">
                          {['Cónyuge/ Conviviente', 'Hermano/a', 'Hijo/a', 'Padre/ Madre', 'Otro familiar', 'Otra persona NO familiar'].map(v => (
                            <label key={v} className="checkbox-label">
                              <input type="checkbox" checked={formData.vive_otra_pm_vinculo.includes(v)} onChange={() => handleCheckboxGroup('vive_otra_pm_vinculo', v)} />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>28) ¿Cuida o apoya a otra persona?:</label>
                      <select name="cuida_a_otro" value={formData.cuida_a_otro} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.cuida_a_otro === 'Sí' && (
                      <>
                        <div className="form-group full">
                          <label>29) ¿A quién cuida?:</label>
                          <div className="checkbox-grid">
                            {['Cónyuge/ conviviente', 'Hijo/a', 'Padres', 'Nietos/ Bisnietos', 'Sobrino/ Sobrina', 'Hermano/Hermana', 'Otros familiares', 'No familiares'].map(q => (
                              <label key={q} className="checkbox-label">
                                <input type="checkbox" checked={formData.cuida_a_otro_detalle.includes(q)} onChange={() => handleCheckboxGroup('cuida_a_otro_detalle', q)} />
                                {q}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="form-group full">
                          <label>30) ¿Gestionó credencial de cuidador(a)?:</label>
                          <select name="cuidador_credencial" value={formData.cuidador_credencial} onChange={handleChange}>
                            <option value="Sí">Sí</option>
                            <option value="No, pero se encuentra en trámite">No, pero se encuentra en trámite</option>
                            <option value="No y no he iniciado el trámite">No y no he iniciado el trámite</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <label>31) ¿Recibe ayuda o cuidados para actividades diarias?:</label>
                      <select name="recibe_cuidados" value={formData.recibe_cuidados} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.recibe_cuidados === 'Sí' && (
                      <div className="form-group full">
                        <label>32) ¿Quién le brinda el apoyo?:</label>
                        <div className="checkbox-grid">
                          {['Cónyuge/conviviente', 'Hijo(a)', 'Nieto(a)', 'Madre/padre', 'Sobrino(a)', 'Hermano(a)', 'Vecino(a)', 'Otro familiar', 'Trabajador(a) remunerado', 'Profesional'].map(r => (
                            <label key={r} className="checkbox-label">
                              <input type="checkbox" checked={formData.recibe_cuidados_quien.includes(r)} onChange={() => handleCheckboxGroup('recibe_cuidados_quien', r)} />
                              {r}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group full">
                      <label>33) Frecuencia de visitas de familiares o cercanos: *</label>
                      <select name="frecuencia_visitas" value={formData.frecuencia_visitas} onChange={handleChange}>
                        <option value="Diario">Diario</option>
                        <option value="Varias veces por semana">Varias veces por semana</option>
                        <option value="Una vez por semana">Una vez por semana</option>
                        <option value="Ocasionalmente">Ocasionalmente</option>
                        <option value="Nunca">Nunca</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* H.- VIVIENDA Y HABITABILIDAD */}
                <fieldset className="seccion-fieldset">
                  <legend>H.- ANTECEDENTES DE LA VIVIENDA Y HABITABILIDAD</legend>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>34) Situación habitacional:</label>
                      <select name="situacion_habitacional" value={formData.situacion_habitacional} onChange={handleChange}>
                        <option value="Propietario(a)">Propietario(a)</option>
                        <option value="Propietario(a) con deuda">Propietario(a) con deuda</option>
                        <option value="Arrendatario(a)">Arrendatario(a)</option>
                        <option value="Allegado(a)">Allegado(a)</option>
                        <option value="Copropiedad">Copropiedad</option>
                        <option value="Herencia">Herencia</option>
                        <option value="Usufructo">Usufructo</option>
                        <option value="Cedida">Cedida</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>35) Cubierta de la vivienda: *</label>
                      <div className="checkbox-grid">
                        {['Asbesto-cemento', 'Zinc', 'Madera', 'Pizarreño', 'No sabe / No responde'].map(cb => (
                          <label key={cb} className="checkbox-label">
                            <input type="checkbox" checked={formData.cubierta_vivienda.includes(cb)} onChange={() => handleCheckboxGroup('cubierta_vivienda', cb)} />
                            {cb}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>36) Material predominante:</label>
                      <select name="material_predominante" value={formData.material_predominante} onChange={handleChange}>
                        <option value="Solido">Sólido</option>
                        <option value="Madera">Madera</option>
                        <option value="Mixto">Mixto</option>
                        <option value="No sabe / No recuerda">No sabe / No recuerda</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>37) Última revisión eléctrica:</label>
                      <select name="revision_electrica" value={formData.revision_electrica} onChange={handleChange}>
                        <option value="Menos de 1 año">Menos de 1 año</option>
                        <option value="Entre 1 y 5 años">Entre 1 y 5 años</option>
                        <option value="Más de 5 años">Más de 5 años</option>
                        <option value="Nunca">Nunca</option>
                        <option value="No sabe / No recuerda">No sabe / No recuerda</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>38) Alcantarillado:</label>
                      <select name="alcantarillado_sistema" value={formData.alcantarillado_sistema} onChange={handleChange}>
                        <option value="Individual">Individual</option>
                        <option value="Compartido">Compartido</option>
                        <option value="No sabe / No responde">No sabe / No responde</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>39) ¿Problemas o filtración en alcantarillado?:</label>
                      <select name="alcantarillado_problemas" value={formData.alcantarillado_problemas} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                        <option value="No sabe/ no responde">No sabe/ no responde</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>40) Estado general de la vivienda:</label>
                      <select name="estado_vivienda" value={formData.estado_vivienda} onChange={handleChange}>
                        <option value="Bueno">Bueno</option>
                        <option value="Regular">Regular</option>
                        <option value="Malo">Malo</option>
                        <option value="Muy malo">Muy malo</option>
                        <option value="No sabe / No responde">No sabe / No responde</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>41) Frecuencia de alimentación al día:</label>
                      <select name="alimentacion_frecuencia" value={formData.alimentacion_frecuencia} onChange={handleChange}>
                        <option value="1 vez al día">1 vez al día</option>
                        <option value="2 veces al día">2 veces al día</option>
                        <option value="3 veces al día">3 veces al día</option>
                        <option value="4 veces al día">4 veces al día</option>
                        <option value="No responde">No responde</option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>42) En qué consiste su alimentación:</label>
                      <input type="text" name="alimentacion_detalle" placeholder="Ej: Comida casera, frutas, verduras, colaciones" value={formData.alimentacion_detalle} onChange={handleChange} />
                    </div>

                    <div className="form-group full">
                      <label>43) Para calefaccionarse y abrigarse cuenta con:</label>
                      <select name="calefaccion" value={formData.calefaccion} onChange={handleChange}>
                        <option value="Estufa a gas">Estufa a gas</option>
                        <option value="Estufa a parafina">Estufa a parafina</option>
                        <option value="Frazadas">Frazadas</option>
                        <option value="No cuenta con ninguna forma de calefacción o abrigo">No cuenta con ninguna forma de calefacción o abrigo</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {/* I.- LABORAL / OCUPACIONAL */}
                <fieldset className="seccion-fieldset">
                  <legend>I.- ANTECEDENTES LABORALES / OCUPACIONALES</legend>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>44) ¿Realiza actividad laboral o emprendimiento?:</label>
                      <select name="trabaja_actualmente" value={formData.trabaja_actualmente} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.trabaja_actualmente === 'Sí' && (
                      <>
                        <div className="form-group">
                          <label>45) Ocupación o actividad principal:</label>
                          <input type="text" name="trabajo_ocupacion" value={formData.trabajo_ocupacion} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label>46) Ingreso mensual aproximado ($):</label>
                          <input type="text" name="trabajo_ingreso" placeholder="Ej: 250000" value={formData.trabajo_ingreso} onChange={handleChange} />
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <label>47) ¿Se encuentra pensionado/a?:</label>
                      <select name="pensionado" value={formData.pensionado} onChange={handleChange}>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {formData.pensionado === 'Sí' && (
                      <>
                        <div className="form-group full">
                          <label>48) Tipo de pensión que recibe:</label>
                          <div className="checkbox-grid">
                            {['PGU', 'AFP', 'PBSI'].map(p => (
                              <label key={p} className="checkbox-label">
                                <input type="checkbox" checked={formData.pension_tipo.includes(p)} onChange={() => handleCheckboxGroup('pension_tipo', p)} />
                                {p}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="form-group">
                          <label>49) Monto aproximado de la pensión ($):</label>
                          <input type="text" name="pension_monto" placeholder="Ej: 214000" value={formData.pension_monto} onChange={handleChange} />
                        </div>
                      </>
                    )}
                  </div>
                </fieldset>

                {/* J.- COMUNITARIO */}
                <fieldset className="seccion-fieldset">
                  <legend>J.- ANTECEDENTES COMUNITARIOS</legend>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>50) ¿Participa de algún Programa Social o Municipal?:</label>
                      <select name="programa_social" value={formData.programa_social} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.programa_social === 'Sí' && (
                      <div className="form-group">
                        <label>51) ¿Cuál programa?:</label>
                        <input type="text" name="programa_social_detalle" placeholder="Ej: Vínculos, Centro Diurno, Red de Apoyos" value={formData.programa_social_detalle} onChange={handleChange} />
                      </div>
                    )}

                    <div className="form-group">
                      <label>52) ¿Participa de alguna organización?:</label>
                      <select name="organizacion_participa" value={formData.organizacion_participa} onChange={handleChange}>
                        <option value="No">No</option>
                        <option value="Sí">Sí</option>
                      </select>
                    </div>

                    {formData.organizacion_participa === 'Sí' && (
                      <div className="form-group">
                        <label>53) ¿Cuál organización?:</label>
                        <input type="text" name="organizacion_detalle" placeholder="Ej: Club Adulto Mayor, Junta de Vecinos" value={formData.organizacion_detalle} onChange={handleChange} />
                      </div>
                    )}

                    <div className="form-group full">
                      <label>54) ¿Asiste a talleres o actividades comunitarias?:</label>
                      <div className="checkbox-grid">
                        {[
                          'Actividad física y deportiva',
                          'Actividades recreativas y culturales',
                          'Actividades formativas y educativas',
                          'Talleres de Salud y bienestar',
                          'No participa en ninguna actividad o taller'
                        ].map(t => (
                          <label key={t} className="checkbox-label">
                            <input type="checkbox" checked={formData.talleres_actividades.includes(t)} onChange={() => handleCheckboxGroup('talleres_actividades', t)} />
                            {t}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </>
            )}

            {/* K.- OBSERVACIONES */}
            <fieldset className="seccion-fieldset">
              <legend>K.- OBSERVACIONES Y REGISTRO FINAL</legend>
              <div className="form-group full">
                <label>55) Registrar información adicional relevante o motivo de no respuesta: *</label>
                <textarea 
                  name="observaciones" 
                  rows="4" 
                  value={formData.observaciones} 
                  onChange={handleChange}
                  placeholder="Detallar condiciones de salud observadas, accesibilidad de la vivienda, situación del sector, motivo de rechazo o no ubicación."
                  required
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