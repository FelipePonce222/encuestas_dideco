import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { apiFetch } from '../api';
import './Graficos.css';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const FRANJAS = ['Total', 'Franja 1', 'Franja 2', 'Franja 3'];

const PALETA_TORTA = [
  '#2f855a', // Verde institucional oscuro
  '#68d391', // Verde claro
  '#a0aec0', // Gris neutro (Sin información)
  '#dd6b20', // Naranjo apoyo
  '#3182ce'  // Azul apoyo
];

export default function Graficos() {
  const navigate = useNavigate();
  const [franjaActiva, setFranjaActiva] = useState('Total');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    setError('');

    apiFetch(`http://localhost:5000/api/graficos?franja=${encodeURIComponent(franjaActiva)}`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los gráficos estadísticos.');
        return res.json();
      })
      .then((data) => {
        setDatos(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [franjaActiva]);

  const construirDatosTorta = (bloque, colores = PALETA_TORTA) => {
    if (!bloque || !bloque.labels) return { labels: [], datasets: [] };
    const labelsConDato = bloque.labels.map(
      (lbl, idx) => `${lbl}: ${bloque.porcentajes[idx]}% (${bloque.valores[idx]})`
    );
    return {
      labels: labelsConDato,
      datasets: [
        {
          data: bloque.valores,
          backgroundColor: colores.slice(0, bloque.valores.length),
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    };
  };

  const construirDatosBarras = (bloque, etiqueta = 'Personas', color = '#48963b') => {
    if (!bloque || !bloque.labels) return { labels: [], datasets: [] };
    return {
      labels: bloque.labels,
      datasets: [
        {
          label: etiqueta,
          data: bloque.porcentajes,
          cantidades: bloque.valores,
          backgroundColor: color,
          borderRadius: 5,
          maxBarThickness: 38
        }
      ]
    };
  };

  const opcionesTorta = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 14,
          font: { size: 12.5 }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}`
        }
      }
    }
  };

  const opcionesBarrasVertical = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = ctx.parsed.y ?? 0;
            const cant = ctx.dataset.cantidades?.[ctx.dataIndex] ?? 0;
            return ` ${pct}% (${cant} personas)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (val) => `${val}%` }
      }
    }
  };

  const opcionesBarrasHorizontal = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = ctx.parsed.x ?? 0;
            const cant = ctx.dataset.cantidades?.[ctx.dataIndex] ?? 0;
            return ` ${pct}% (${cant} registros)`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (val) => `${val}%` }
      },
      y: {
        ticks: {
          font: { size: 12 }
        }
      }
    }
  };

  return (
    <div className="graficos-container">
      <Navbar />

      <div className="dashboard-action-bar">
        <button className="dashboard-action-btn" onClick={() => navigate('/nueva-encuesta')}>
          Nueva Encuesta
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/busqueda-rut')}>
          Búsqueda por Rut
        </button>
        <button className="dashboard-action-btn" onClick={() => navigate('/informes')}>
          Informes
        </button>
        <button
          className="dashboard-action-btn"
          onClick={() => window.open('https://www.municipalidadlagranja.cl/', '_blank')}
        >
          Municipalidad
        </button>
      </div>

      <main className="graficos-main">
        {/* Barra superior de navegación e impresión */}
        <div className="graficos-top-bar">
          <button
            type="button"
            className="graficos-btn-volver"
            onClick={() => navigate('/dashboard')}
          >
            ⬅ Volver al Panel
          </button>

          <button
            type="button"
            className="graficos-btn-imprimir"
            onClick={() => window.print()}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>

        {/* Encabezado y Selector de Franja */}
        <div className="graficos-header-card">
          <div>
            <h1>📊 Análisis Estadístico Encuesta Personas Mayores</h1>
            <p>Visualización de indicadores por dimensión territorial — I. Municipalidad de La Granja</p>
          </div>

          <div className="graficos-filtros-franja">
            {FRANJAS.map((franja) => (
              <button
                key={franja}
                type="button"
                onClick={() => setFranjaActiva(franja)}
                className={`franja-pill-btn ${franjaActiva === franja ? 'active' : ''}`}
              >
                {franja}
              </button>
            ))}
          </div>
        </div>

        {cargando && <div className="graficos-estado">Cargando indicadores de {franjaActiva}...</div>}
        {error && <div className="graficos-error">{error}</div>}

        {!cargando && !error && datos && (
          <>
            {/* KPIs rápidos del filtro activo */}
            <div className="graficos-kpi-row">
              <div className="graficos-kpi-box">
                <span>VIVIENDAS VISITADAS ({franjaActiva.toUpperCase()})</span>
                <strong>{datos.resumen.total_visitadas}</strong>
              </div>
              <div className="graficos-kpi-box kpi-verde">
                <span>ENCUESTAS CONCRETADAS</span>
                <strong>
                  {datos.resumen.concretadas} <small>({datos.resumen.pct_concretadas}%)</small>
                </strong>
              </div>
              <div className="graficos-kpi-box kpi-gris">
                <span>NO CONCRETADAS</span>
                <strong>
                  {datos.resumen.no_concretadas} <small>({datos.resumen.pct_no_concretadas}%)</small>
                </strong>
              </div>
            </div>

            {/* BLOQUE EXTRA: COBERTURA DE ENCUESTAS */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">📌 Cobertura Operativa en Terreno ({franjaActiva})</h2>
              <div className="graficos-grid-2">
                <div className="grafico-card">
                  <h3>Gráfico 0.- Encuestas Concretadas vs. No Concretadas (n={datos.cobertura.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.cobertura, ['#2f855a', '#cbd5e0'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 1.- Situación de la persona mayor (n={datos.situacion_pm.n})</h3>
                  <div className="chart-box-barra-h">
                    <Bar
                      data={construirDatosBarras(datos.situacion_pm, 'Visitas')}
                      options={opcionesBarrasHorizontal}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* DIMENSIÓN 1: ANTECEDENTES DE LA PERSONA MAYOR */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">👤 Dimensión: Antecedentes de la Persona Mayor</h2>
              <div className="graficos-grid-2">
                <div className="grafico-card">
                  <h3>Gráfico 2.- Género (n={datos.genero.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.genero, ['#8ab87c', '#48963b', '#a0aec0'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 3.- Distribución por Edad (n={datos.edad.n})</h3>
                  <div className="chart-box-barra">
                    <Bar
                      data={construirDatosBarras(datos.edad, 'Personas')}
                      options={opcionesBarrasVertical}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* DIMENSIÓN 2: ANTECEDENTES DE SALUD */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">🩺 Dimensión: Antecedentes de Salud</h2>
              <div className="graficos-grid-3">
                <div className="grafico-card">
                  <h3>Gráfico 11.- ¿Presenta alguna patología de Salud? (n={datos.patologia.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.patologia, ['#48963b', '#9ae6b4'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 13.- Discapacidad (n={datos.discapacidad.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.discapacidad, ['#8ab87c', '#48963b'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 14.- Tipo de Discapacidad (n={datos.tipo_discapacidad.n})</h3>
                  <div className="chart-box-barra-h">
                    <Bar
                      data={construirDatosBarras(datos.tipo_discapacidad, 'Personas')}
                      options={opcionesBarrasHorizontal}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* DIMENSIÓN 3: ANTECEDENTES LABORALES */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">💼 Dimensión: Antecedentes Laborales</h2>
              <div className="graficos-grid-2">
                <div className="grafico-card">
                  <h3>
                    Gráfico 17.- ¿Actualmente realiza alguna actividad laboral o de emprendimiento? (n={datos.actividad_laboral.n})
                  </h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.actividad_laboral, ['#2f855a', '#68a64c', '#cbd5e0'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 16.- Pensión (n={datos.pension.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.pension, ['#2f855a', '#68a64c', '#cbd5e0'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* DIMENSIÓN 4: PARTICIPACIÓN COMUNITARIA */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">🤝 Dimensión: Participación Comunitaria y Redes</h2>
              <div className="graficos-grid-2">
                <div className="grafico-card">
                  <h3>
                    Gráfico 20.- ¿Con qué frecuencia recibe visitas o contacto de familiares o cercanos? (n={datos.frecuencia_visitas.n})
                  </h3>
                  <div className="chart-box-barra-h">
                    <Bar
                      data={construirDatosBarras(datos.frecuencia_visitas, 'Personas')}
                      options={opcionesBarrasHorizontal}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 21.- ¿Participa de algún Programa Social o Municipal? (n={datos.programa_social.n})</h3>
                  <div className="chart-box-torta">
                    <Pie
                      data={construirDatosTorta(datos.programa_social, ['#9ae6b4', '#48963b', '#276749'])}
                      options={opcionesTorta}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* DIMENSIÓN 5: CARACTERIZACIÓN DE LA VIVIENDA */}
            <section className="graficos-seccion">
              <h2 className="graficos-seccion-titulo">🏠 Dimensión: Caracterización de la Vivienda</h2>
              <div className="graficos-grid-2">
                <div className="grafico-card">
                  <h3>Gráfico 5.- Situación de la vivienda (n={datos.situacion_vivienda.n})</h3>
                  <div className="chart-box-barra-h-tall">
                    <Bar
                      data={construirDatosBarras(datos.situacion_vivienda, 'Viviendas')}
                      options={opcionesBarrasHorizontal}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 10.- ¿Cómo considera el estado general de su vivienda? (n={datos.estado_vivienda.n})</h3>
                  <div className="chart-box-barra">
                    <Bar
                      data={construirDatosBarras(datos.estado_vivienda, 'Viviendas')}
                      options={opcionesBarrasVertical}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>
                    Gráfico 8.- ¿Cuándo fue la última vez que se realizó una revisión al sistema eléctrico? (n={datos.revision_electrica.n})
                  </h3>
                  <div className="chart-box-barra">
                    <Bar
                      data={construirDatosBarras(datos.revision_electrica, 'Viviendas')}
                      options={opcionesBarrasVertical}
                    />
                  </div>
                </div>

                <div className="grafico-card">
                  <h3>Gráfico 7.- Material predominante de la vivienda (n={datos.material_vivienda.n})</h3>
                  <div className="chart-box-barra">
                    <Bar
                      data={construirDatosBarras(datos.material_vivienda, 'Viviendas')}
                      options={opcionesBarrasVertical}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}