# 👵👴 Sistema de Gestión y Diagnóstico de Vulnerabilidad del Adulto Mayor
> **Municipalidad de La Granja — Dirección de Desarrollo Comunitario (DIDECO)**

Sistema web integral diseñado para la captura, procesamiento y análisis territorial de encuestas de vulnerabilidad aplicadas a adultos mayores de la comuna de La Granja. La plataforma permite evaluar niveles de riesgo, automatizar el cálculo de puntajes (scoring) y gestionar la cobertura por franjas geográficas.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
- [Modelo de Base de Datos](#-modelo-de-base-de-datos)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Equipo y Créditos](#-equipo-y-créditos)

---

## ✨ Características Principales

* **🔒 Autenticación y Perfiles:** Inicio de sesión seguro para funcionarios y trabajadores sociales con gestión de roles y cuentas individuales.
* **📝 Formulario Dinámico de Encuesta:** Módulo de captura con 54 preguntas categorizadas (Salud, Vivienda, Redes de Apoyo) y cálculo en tiempo real del puntaje de vulnerabilidad.
* **📍 Filtrado y Búsqueda por Franjas:** Dashboard con segmentación territorial (Franjas 1 a 6) e índice optimizado para consultas instantáneas por RUT o nombre del vecino.
* **📊 Alertas de Vulnerabilidad:** Clasificación automática de casos en niveles de riesgo (**Alta**, **Media**, **Baja**) para priorización en terreno.
* **👁️ Histórico y Detalle:** Visualización en modal del desglose completo de respuestas tomadas en encuestas pasadas.

---

## 🛠️ Arquitectura y Stack Tecnológico

El sistema sigue una arquitectura desacoplada de 3 capas:

```text
[ React (Vite) ] <─── HTTP / JSON (Axios) ───> [ API Flask (Python) ] <─── oracledb ───> [ Oracle SQL Database ]
   (Frontend)                                      (Backend REST)                            (Base de Datos)