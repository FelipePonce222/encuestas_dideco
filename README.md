🏛️ Sistema de Gestión y Diagnóstico Social IVPM — DIDECO La Granja
Sistema web e intramunicipal de gestión, monitoreo y análisis de encuestas para personas mayores de la comuna de La Granja. Diseñado para el levantamiento de datos en terreno, evaluación del Índice de Vulnerabilidad de Personas Mayores (IVPM), generación de métricas de cobertura en tiempo real y exportación de informes analíticos institucionales.
---
🚀 Características Principales
🔐 Autenticación y Control de Acceso: Gestión de usuarios por sesión y protección estricta de rutas privadas (`ProtectedRoute`) para restringir el acceso únicamente a funcionarios autorizados de DIDECO.
📊 Dashboard de Inteligencia Municipal: Panel visual con métricas clave (KPIs) en tiempo real y gráficos dinámicos (Chart.js) para la distribución del IVPM y el seguimiento de visitas territoriales.
📑 Centro de Informes y Exportación:
Generación de matrices analíticas en Excel (`.xlsx`) desglosando automáticamente las 54+ preguntas guardadas en formato JSON en columnas independientes.
Formato listo para impresión / exportación a PDF de reportes ejecutivos.
🔍 Búsqueda y Monitoreo por RUT: Consulta del historial individual de vecinos y visualización inmediata de la tabla con las 10 encuestas más recientes.
📝 Registro Completo de Encuestas: Formulario dinámico para la toma de datos sociales, antecedentes de salud, vivienda y redes de apoyo.
---
🛠️ Tecnología y Stack Técnico
Frontend
Framework: React.js (Vite)
Enrutamiento: React Router DOM v6
Visualización de Datos: Chart.js & React-ChartJS-2
Estilos: CSS3 modular e integrado
Backend
Framework: Python Flask
Base de Datos: SQLite (con manejo de marcas de tiempo ISO y almacenamiento JSON en `datos_completos`)
Procesamiento de Datos: Pandas & OpenPyXL (para generación de reportes Excel)
---
📦 Requisitos Previos e Instalación
Asegúrate de tener instalado en tu sistema:
Node.js (v16 o superior)
Python (v3.9 o superior)
1. Configuración del Backend (Flask)
```bash
# Navegar a la carpeta del servidor
cd backend

# Crear entorno virtual (opcional pero recomendado)
python -m venv env

# Activar entorno virtual
# En Windows:
env\Scripts\activate
# En Linux/Mac:
source env/bin/activate

# Instalar dependencias del backend
pip install flask flask-cors pandas openpyxl

# Iniciar el servidor Flask
python app.py
```
El servidor correrá por defecto en `http://localhost:5000`.
---
2. Configuración del Frontend (React)
```bash
# Navegar a la carpeta del cliente
cd frontend

# Instalar dependencias de Node.js
npm install

# Dependencias clave requeridas:
npm install react-router-dom chart.js react-chartjs-2

# Iniciar el entorno de desarrollo
npm run dev
```
La aplicación cliente correrá por defecto en `http://localhost:5173`.
---
📁 Estructura del Proyecto
```text
encuestas_dideco/
├── backend/
│   ├── app.py                 # Servidor Flask, endpoints API y exportación a Excel
│   └── encuestas.db           # Base de datos SQLite (vecinos y funcionarios)
├── frontend/
│   ├── src/
│   │   ├── assets/            # Recursos gráficos (logos, hero bg)
│   │   ├── components/        # Componentes reutilizables (Navbar, Footer, ProtectedRoute)
│   │   ├── pages/             # Vistas principales (Dashboard, BusquedaRut, GenerarInforme, Login)
│   │   ├── App.jsx            # Enrutador principal de la app
│   │   └── main.jsx           # Punto de entrada de React
│   ├── package.json
│   └── vite.config.js
└── README.md
```
---
🔒 Endpoints Principales de la API
Método	Ruta	Descripción
`POST`	`/api/login`	Autenticación de funcionario municipal
`GET`	`/api/dashboard/stats`	Métricas agregadas y conteo por nivel IVPM
`GET`	`/api/encuestas/recientes`	Retorna los 10 registros más recientes
`GET`	`/api/encuestas/rut/<rut>`	Consulta de encuesta individual por RUT
`GET`	`/api/reports/excel`	Descarga de la matriz de encuestas en formato `.xlsx`
---
🛡️ Seguridad y Privacidad de Datos
Protección de Datos: Diseñado para cumplir con el resguardo de información social sensible de las personas mayores de la comuna.
Uso Exclusivo: Plataforma orientada a la operación interna del equipo DIDECO La Granja.
---
Municipalidad de La Granja — Dirección de Desarrollo Comunitario (DIDECO)