# 📊 Generador de Asientos de Nóminas - Charo Ruiz Ibiza

Sistema completo de gestión y procesamiento de nóminas para generar asientos contables compatibles con **Gextia ERP** (basado en Odoo).

## ✨ Características

### 🔄 Procesamiento de Nóminas
- **Carga de Excel**: Drag & drop o selección manual
- **Detección automática** de columnas de nóminas
- **Cálculo inteligente** de bases IRPF (dinerarias, en especie, irregulares, exentas)
- **Generación automática** de asientos contables en formato Gextia
- **Distribución analítica** por departamentos y centros de trabajo

### 👥 Base de Datos de Empleados
- **CRUD completo**: Crear, Editar y Eliminar empleados
- **Importación masiva** desde Excel
- **Exportación** de la base de datos completa
- **Almacenamiento persistente** con localStorage
- Gestión de **departamentos** (6 tipos) y **centros de trabajo** (5 ubicaciones)
- Soporte para empleados con **múltiples centros** (reparto proporcional)

### 📜 Histórico de Operaciones
- Registro automático de **todos los asientos generados**
- Información detallada: fecha, referencia, empleados, importes
- **Distribución analítica** completa guardada
- Máximo 50 entradas (FIFO automático)

## 🚀 Uso

### Opción 1: Descarga Directa
1. Descarga el archivo `index.html`
2. Ábrelo en cualquier navegador moderno
3. ¡Listo para usar!

### Opción 2: GitHub Pages
Visita: `https://piperuiz-rgb.github.io/Nominas`

## 📋 Formato de Excel de Nóminas

El sistema espera un archivo Excel con la siguiente estructura:

**Fila 7 (encabezados):**
- Columna A: Código empleado
- Columna B: DEPARTAMENTO
- Columna C: CENTRO
- Columnas siguientes: Conceptos de nómina (TOT. BRUTO, B.IRPF DIN, B.IRPF ESP, SS EMPRESA, etc.)

**Fila 9 en adelante:** Datos de empleados

### Departamentos
- `1` - Logística
- `2` - Marketing
- `3` - Comercial
- `4` - Producción
- `5` - Administración
- `6` - Dirección

### Centros de Trabajo
- `1` - Tienda Ibiza
- `2` - Tienda Madrid
- `3` - Tienda Puerto Banús
- `4` - Oficinas centrales
- `5` - Almacén Badalona

**Centros múltiples:** Se pueden indicar varios separados por espacios (ej: `1 2 3`)

## 📥 Importar Base de Datos de Empleados

Formato del Excel:

| Código Empleado | Departamento | Centro |
|-----------------|--------------|--------|
| 000001          | 6            | 4      |
| 000002          | 6            | 4      |
| 000069          | 3            | 1 2 3  |

## 🔢 Mapeo de Cuentas Contables

### Cuentas DEBE
- **640** - Sueldos y salarios
  - Dinerarios (con retención IRPF dinerarios)
  - En especie (con retención IRPF en especie)
  - Irregulares (con retención IRPF dinerarios)
  - Exentos (sin retención)
- **642** - Seguridad Social a cargo empresa

### Cuentas HABER
- **476** - Seguridad Social acreedora
- **755XXXX** - Ingresos por servicios al personal
  - 7550000001 - Póliza convenio (DIF SALA)
  - 7550000002 - Seguro médico
  - 7550000003 - Vivienda
- **465XXXXXX** - Remuneraciones pendientes (una cuenta por empleado)
  - Ejemplo: Empleado 000001 → Cuenta 4650000001

### Conceptos Especiales
- **Dietas y Anticipos**: Se desglosan por separado en la cuenta 465 de cada empleado
- **Anticipo neto**: Columna 0708-ANTICIPO menos 0604 DIETAS

## 📊 Distribución Analítica

El sistema calcula automáticamente:

### Por Departamento
- Porcentaje de la **cuenta 640** por departamento
- Porcentaje de la **cuenta 642** por departamento

### Por Centro de Trabajo
- Porcentaje de la **cuenta 640** por centro
- Porcentaje de la **cuenta 642** por centro
- **Reparto proporcional** para empleados con múltiples centros

## 🛠️ Tecnologías

- **HTML5** + **CSS3** + **Vanilla JavaScript**
- **XLSX.js** - Lectura y escritura de archivos Excel
- **localStorage** - Almacenamiento persistente
- **Diseño responsive** - Adaptable a cualquier dispositivo

## 📱 Compatibilidad

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 💾 Almacenamiento Local

Los datos se guardan en el navegador usando `localStorage`:
- **Base de datos de empleados**: Hasta 5MB
- **Histórico**: Últimas 50 operaciones
- **Persistencia**: Los datos se mantienen aunque cierres el navegador

⚠️ **Nota**: Los datos se borran si limpias la caché del navegador.

## 🔐 Privacidad

- ✅ **100% offline** después de la carga inicial
- ✅ **Sin servidor** - Todo se procesa en el navegador
- ✅ **Sin envío de datos** - Tu información nunca sale de tu ordenador
- ✅ **Sin cookies de terceros**

## 📄 Licencia

© 2026 Charo Ruiz Ibiza. Todos los derechos reservados.

## 🤝 Contribuciones

Este es un proyecto privado desarrollado específicamente para Charo Ruiz Ibiza.

## 📞 Soporte

Para consultas o problemas, contacta con el departamento de administración.

---

**Versión:** 1.0.0  
**Última actualización:** Febrero 2026
