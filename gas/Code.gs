// ================================================
// NOMINAS - Google Apps Script
// Generador de Asiento Contable de Nóminas
// Hoja: ASIENTO NOMINAS MENSUALES
// Carpeta Drive: APLICACION NOMINAS
// ================================================

var FOLDER_NAME = 'APLICACION NOMINAS';
var SHEET_ASIENTO = 'Asiento';
var SHEET_EMPLEADOS = 'Empleados';
var SHEET_HISTORICO = 'Histórico';

var DEPARTAMENTOS = {
  1: 'Logística',
  2: 'Marketing',
  3: 'Comercial',
  4: 'Producción',
  5: 'Administración',
  6: 'Dirección'
};

// ---- MENÚ ----

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Nóminas')
    .addItem('Procesar Nómina', 'showSidebar')
    .addSeparator()
    .addItem('Gestionar Empleados', 'showEmpleadosSidebar')
    .addToUi();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Asiento de Nóminas')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showEmpleadosSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('SidebarEmpleados')
    .setTitle('Base de Datos de Empleados')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ---- DRIVE: LISTAR Y LEER ARCHIVOS ----

function getArchivosNominas() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    throw new Error('No se encontró la carpeta "' + FOLDER_NAME + '" en Google Drive. Créala y sube ahí los archivos .xlsx de nóminas.');
  }
  var folder = folders.next();
  var files = folder.getFilesByType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  var result = [];
  while (files.hasNext()) {
    var f = files.next();
    result.push({
      id: f.getId(),
      name: f.getName(),
      date: f.getLastUpdated().toISOString()
    });
  }

  result.sort(function(a, b) { return b.date.localeCompare(a.date); });
  return result;
}

function leerDatosNomina(fileId) {
  // Convierte el .xlsx a Google Sheets temporalmente para leer los datos
  var temp = Drive.Files.copy(
    { title: 'TEMP_NOMINA_' + Date.now(), mimeType: 'application/vnd.google-apps.spreadsheet' },
    fileId
  );
  var tempId = temp.id;

  try {
    var ss = SpreadsheetApp.openById(tempId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    return data;
  } finally {
    DriveApp.getFileById(tempId).setTrashed(true);
  }
}

// ---- DETECCIÓN DE COLUMNAS ----

function findColumnIndex(headers, columnName, skip) {
  skip = skip || 0;
  var skipped = 0;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().indexOf(columnName) !== -1) {
      if (skipped >= skip) return i;
      skipped++;
    }
  }
  return -1;
}

function parseValue(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
  return 0;
}

function round2(val) {
  return Math.round((val || 0) * 100) / 100;
}

// ---- BASE DE DATOS EMPLEADOS (pestaña "Empleados") ----

function getEmpleadosSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EMPLEADOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EMPLEADOS);
    sheet.appendRow(['Código Empleado', 'Departamento', 'Centro']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e8f0fe');
  }
  return sheet;
}

function getEmpleados() {
  var sheet = getEmpleadosSheet();
  var data = sheet.getDataRange().getValues();
  var empleados = {};
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var codigo = String(row[0]).padStart(6, '0');
    empleados[codigo] = {
      departamento: parseInt(row[1]) || 0,
      centro: String(row[2] || '')
    };
  }
  return empleados;
}

function saveEmpleados(empleados) {
  var sheet = getEmpleadosSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  }

  var keys = Object.keys(empleados).sort();
  if (keys.length === 0) return;

  var rows = keys.map(function(codigo) {
    return [codigo, empleados[codigo].departamento, empleados[codigo].centro];
  });
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
}

function guardarEmpleado(codigo, departamento, centro) {
  var empleados = getEmpleados();
  codigo = String(codigo).padStart(6, '0');
  empleados[codigo] = { departamento: parseInt(departamento) || 0, centro: String(centro) };
  saveEmpleados(empleados);
  return getEmpleadosLista();
}

function eliminarEmpleado(codigo) {
  var empleados = getEmpleados();
  delete empleados[String(codigo).padStart(6, '0')];
  saveEmpleados(empleados);
  return getEmpleadosLista();
}

function getEmpleadosLista() {
  var empleados = getEmpleados();
  return Object.keys(empleados).sort().map(function(codigo) {
    return { codigo: codigo, departamento: empleados[codigo].departamento, centro: empleados[codigo].centro };
  });
}

// ---- HISTÓRICO (pestaña "Histórico") ----

function getHistoricoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_HISTORICO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HISTORICO);
    sheet.appendRow(['Fecha', 'Referencia', 'Diario', 'Empleados', 'Total Bruto', 'Total Líquido', 'Generado el']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8f0fe');
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 130);
    sheet.setColumnWidth(6, 130);
    sheet.setColumnWidth(7, 170);
  }
  return sheet;
}

function addHistorico(entry) {
  var sheet = getHistoricoSheet();
  var data = sheet.getDataRange().getValues();
  var mesClave = entry.fecha.slice(0, 7); // YYYY-MM

  // Eliminar entrada existente del mismo mes (de abajo hacia arriba para evitar saltos de índice)
  for (var i = data.length - 1; i >= 1; i--) {
    var fila = data[i];
    if (fila[0] && String(fila[0]).slice(0, 7) === mesClave) {
      sheet.deleteRow(i + 1);
    }
  }

  // Insertar al inicio (fila 2, después de la cabecera)
  sheet.insertRowAfter(1);
  sheet.getRange(2, 1, 1, 7).setValues([[
    entry.fecha,
    entry.referencia,
    entry.diario,
    entry.empleados,
    entry.totalBruto,
    entry.totalLiquido,
    entry.timestamp
  ]]);
  // Formato moneda en columnas 5 y 6
  sheet.getRange(2, 5, 1, 2).setNumberFormat('#,##0.00');
}

// ---- PESTAÑA ASIENTO ----

function getAsientoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ASIENTO);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ASIENTO);
  }
  return sheet;
}

function writeAsientoToSheet(asientoData, dist, irpfTotales) {
  var sheet = getAsientoSheet();
  sheet.clearContents();
  sheet.clearFormats();

  var headers = [
    'Fecha', 'Referencia', 'Diario',
    'Apuntes contables/Cuenta', 'Apuntes Contables/Etiqueta',
    'Apuntes contables/Debe', 'Apuntes contables/Haber',
    'Apuntes contables/Impuestos', 'Empresa'
  ];

  var rows = [headers];
  for (var i = 0; i < asientoData.length; i++) {
    var linea = asientoData[i];
    rows.push([
      i === 0 ? linea.fecha : null,
      i === 0 ? linea.referencia : null,
      i === 0 ? linea.diario : null,
      linea.cuenta,
      linea.etiqueta,
      linea.debe !== null ? linea.debe : null,
      linea.haber !== null ? linea.haber : null,
      linea.impuestos || null,
      null
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);

  // Formato cabecera asiento
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a6fa5');
  headerRange.setFontColor('#ffffff');

  // Anchos de columna
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 300);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 380);
  sheet.setColumnWidth(9, 80);

  // Formato numérico columnas asiento
  if (rows.length > 1) {
    sheet.getRange(2, 4, rows.length - 1, 1).setNumberFormat('0');
    sheet.getRange(2, 6, rows.length - 1, 2).setNumberFormat('#,##0.00');
  }

  sheet.setFrozenRows(1);

  // ---- Sección de distribución y totales IRPF ----
  if (dist && irpfTotales) {
    var startRow = rows.length + 2; // dos filas en blanco después del asiento
    writeDistribucionSection(sheet, dist, irpfTotales, startRow);
  }

  sheet.activate();
}

function writeDistribucionSection(sheet, dist, irpfTotales, startRow) {
  var DEPT_NAMES = { 1:'Logística', 2:'Marketing', 3:'Comercial', 4:'Producción', 5:'Administración', 6:'Dirección' };
  var CENTRO_NAMES = { 1:'Tienda Ibiza', 2:'Tienda Madrid', 3:'Tienda Puerto Banús', 4:'Oficinas centrales', 5:'Almacén Badalona' };
  var fmtPct = function(v, total) { return total > 0 ? Math.round(v / total * 10000) / 100 : 0; };
  var row = startRow;

  // --- Retención IRPF ---
  sheet.getRange(row, 1).setValue('RETENCIÓN IRPF').setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#185abc');
  sheet.getRange(row, 1, 1, 4).setBackground('#e8f0fe');
  row++;
  sheet.getRange(row, 1, 1, 4).setValues([['Concepto', 'Total retenido', '', '']]);
  sheet.getRange(row, 1, 1, 4).setFontWeight('bold').setBackground('#f1f3f4');
  row++;
  sheet.getRange(row, 1, 1, 4).setValues([['IRPF Dinerario (0999-TRI.IRPF)', irpfTotales.din, '', '']]);
  sheet.getRange(row, 2).setNumberFormat('#,##0.00');
  row++;
  sheet.getRange(row, 1, 1, 4).setValues([['IRPF No dinerario (0987-I.I.C.CT)', irpfTotales.esp, '', '']]);
  sheet.getRange(row, 2).setNumberFormat('#,##0.00');
  row++;
  // Total combinado
  sheet.getRange(row, 1, 1, 4).setValues([['TOTAL IRPF', round2(irpfTotales.din + irpfTotales.esp), '', '']]);
  sheet.getRange(row, 1, 1, 2).setFontWeight('bold').setBackground('#f8f9fa');
  sheet.getRange(row, 2).setNumberFormat('#,##0.00');
  row += 2;

  // --- Distribución por departamento ---
  sheet.getRange(row, 1).setValue('DISTRIBUCIÓN POR DEPARTAMENTO').setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#185abc');
  sheet.getRange(row, 1, 1, 5).setBackground('#e8f0fe');
  row++;
  sheet.getRange(row, 1, 1, 5).setValues([['Departamento', '% Cta. 640', 'Importe 640', '% Cta. 642', 'Importe 642']]);
  sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#f1f3f4');
  row++;

  var deptKeys = Object.keys(dist.depts.c640).sort();
  for (var d = 0; d < deptKeys.length; d++) {
    var dk = deptKeys[d];
    var imp640 = round2(dist.depts.c640[dk] || 0);
    var imp642 = round2(dist.depts.c642[dk] || 0);
    sheet.getRange(row, 1, 1, 5).setValues([[
      (DEPT_NAMES[dk] || ('Depto. ' + dk)),
      fmtPct(imp640, dist.totales.c640) / 100,
      imp640,
      fmtPct(imp642, dist.totales.c642) / 100,
      imp642
    ]]);
    sheet.getRange(row, 2).setNumberFormat('0.00%');
    sheet.getRange(row, 3).setNumberFormat('#,##0.00');
    sheet.getRange(row, 4).setNumberFormat('0.00%');
    sheet.getRange(row, 5).setNumberFormat('#,##0.00');
    row++;
  }
  // Fila total
  sheet.getRange(row, 1, 1, 5).setValues([['TOTAL', 1, round2(dist.totales.c640), 1, round2(dist.totales.c642)]]);
  sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#f8f9fa');
  sheet.getRange(row, 2).setNumberFormat('0.00%');
  sheet.getRange(row, 3).setNumberFormat('#,##0.00');
  sheet.getRange(row, 4).setNumberFormat('0.00%');
  sheet.getRange(row, 5).setNumberFormat('#,##0.00');
  row += 2;

  // --- Distribución por centro ---
  sheet.getRange(row, 1).setValue('DISTRIBUCIÓN POR CENTRO').setFontWeight('bold').setBackground('#e8f0fe').setFontColor('#185abc');
  sheet.getRange(row, 1, 1, 5).setBackground('#e8f0fe');
  row++;
  sheet.getRange(row, 1, 1, 5).setValues([['Centro', '% Cta. 640', 'Importe 640', '% Cta. 642', 'Importe 642']]);
  sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#f1f3f4');
  row++;

  var centroKeys = Object.keys(dist.centros.c640).sort();
  for (var c = 0; c < centroKeys.length; c++) {
    var ck = centroKeys[c];
    var ci640 = round2(dist.centros.c640[ck] || 0);
    var ci642 = round2(dist.centros.c642[ck] || 0);
    sheet.getRange(row, 1, 1, 5).setValues([[
      (CENTRO_NAMES[ck] || ('Centro ' + ck)),
      fmtPct(ci640, dist.totales.c640) / 100,
      ci640,
      fmtPct(ci642, dist.totales.c642) / 100,
      ci642
    ]]);
    sheet.getRange(row, 2).setNumberFormat('0.00%');
    sheet.getRange(row, 3).setNumberFormat('#,##0.00');
    sheet.getRange(row, 4).setNumberFormat('0.00%');
    sheet.getRange(row, 5).setNumberFormat('#,##0.00');
    row++;
  }
  // Fila total
  sheet.getRange(row, 1, 1, 5).setValues([['TOTAL', 1, round2(dist.totales.c640), 1, round2(dist.totales.c642)]]);
  sheet.getRange(row, 1, 1, 5).setFontWeight('bold').setBackground('#f8f9fa');
  sheet.getRange(row, 2).setNumberFormat('0.00%');
  sheet.getRange(row, 3).setNumberFormat('#,##0.00');
  sheet.getRange(row, 4).setNumberFormat('0.00%');
  sheet.getRange(row, 5).setNumberFormat('#,##0.00');
}

// ---- LÓGICA DE NEGOCIO ----

function processNominas(params) {
  var fileId = params.fileId;
  var fecha = params.fecha;
  var referencia = params.referencia;
  var diario = params.diario;

  // 1. Leer datos del xlsx
  var data = leerDatosNomina(fileId);

  // 2. Detectar fila de cabeceras buscando 'TOT. BRUTO'
  var headerRow = -1;
  for (var i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && data[i].some(function(c) { return c && c.toString().indexOf('TOT. BRUTO') !== -1; })) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) {
    throw new Error('No se encontró la fila de cabeceras. Verifica que el archivo sea un fichero de nóminas válido (debe contener la columna "TOT. BRUTO").');
  }

  var headers = data[headerRow];

  // Primera fila de datos (saltar filas vacías tras la cabecera)
  var dataStartRow = headerRow + 1;
  while (dataStartRow < data.length && (!data[dataStartRow] || data[dataStartRow].every(function(c) { return c === null || c === ''; }))) {
    dataStartRow++;
  }

  // 3. Detectar índices de columnas por nombre
  var colIndices = {
    numEmpleado: findColumnIndex(headers, 'Empleado'),
    departamento: findColumnIndex(headers, 'DEPARTAMENTO'),
    centro:       findColumnIndex(headers, 'CENTRO'),
    totBruto:     findColumnIndex(headers, 'TOT. BRUTO'),
    totalLiq:     findColumnIndex(headers, 'TOTAL.LIQ.'),
    ssEmpresa:    findColumnIndex(headers, 'SS EMPRESA'),
    ssTotal:      findColumnIndex(headers, 'SS TOTAL.'),
    irpfDin:      findColumnIndex(headers, 'B.IRPF DIN'),
    irpfEsp:      findColumnIndex(headers, 'B.IRPF ESP'),
    irpfIrr:      findColumnIndex(headers, 'B.IRPF IRR'),
    difSala:      findColumnIndex(headers, 'DIF SALA'),
    seguroM1:     findColumnIndex(headers, 'SEGURO M', 0),
    seguroM2:     findColumnIndex(headers, 'SEGURO M', 1),
    seguroS:      findColumnIndex(headers, '0755-Seguro S'),
    vivienda:     findColumnIndex(headers, 'VIVIENDA'),
    dietas:       findColumnIndex(headers, 'DIETAS'),
    anticipo:     findColumnIndex(headers, 'ANTICIPO'),
    devPrestamo:  findColumnIndex(headers, '0705-Dev.'),
    retIrpfDin:   findColumnIndex(headers, '0999-TRI.IRPF'),
    retIrpfEsp:   findColumnIndex(headers, '0987-I.I.C.CT')
  };

  var requiredCols = ['numEmpleado', 'totBruto', 'totalLiq', 'ssEmpresa', 'ssTotal',
    'irpfDin', 'irpfEsp', 'irpfIrr', 'difSala', 'seguroM1', 'seguroM2', 'vivienda', 'dietas', 'anticipo'];
  var missingCols = requiredCols.filter(function(k) { return colIndices[k] === -1; });
  if (missingCols.length > 0) {
    throw new Error('No se encontraron las siguientes columnas en el archivo: ' + missingCols.join(', ') + '. Verifica que el archivo tenga las cabeceras correctas.');
  }

  // 4. Leer empleados de la DB (pestaña Empleados)
  var empleadosDB = getEmpleados();
  var empleados = [];
  var sinDBList = [];

  for (var r = dataStartRow; r < data.length; r++) {
    var row = data[r];
    if (!row || !row[colIndices.numEmpleado]) continue;

    var numEmp = row[colIndices.numEmpleado];
    if (!numEmp) continue;

    var numEmpleadoStr = String(numEmp).padStart(6, '0');

    var departamento = (colIndices.departamento >= 0) ? (parseInt(row[colIndices.departamento]) || 0) : 0;
    var centro = (colIndices.centro >= 0) ? String(row[colIndices.centro] || '').trim() : '';

    if (empleadosDB[numEmpleadoStr]) {
      if (!departamento) departamento = empleadosDB[numEmpleadoStr].departamento;
      if (!centro) centro = empleadosDB[numEmpleadoStr].centro;
    } else {
      sinDBList.push(numEmpleadoStr);
    }

    var seguroM1   = parseValue(row[colIndices.seguroM1]);
    var seguroM2   = parseValue(row[colIndices.seguroM2]);
    var seguroS    = colIndices.seguroS >= 0 ? parseValue(row[colIndices.seguroS]) : 0;
    var vivienda   = parseValue(row[colIndices.vivienda]);
    var irpfDin    = parseValue(row[colIndices.irpfDin]);
    var irpfEsp    = parseValue(row[colIndices.irpfEsp]);
    var irpfIrr    = parseValue(row[colIndices.irpfIrr]);
    var totBruto   = parseValue(row[colIndices.totBruto]);
    var dietas     = parseValue(row[colIndices.dietas]);
    var anticipo   = parseValue(row[colIndices.anticipo]);

    // seguroMTotal: suma de las dos columnas SEGURO M (seguro empresa)
    var seguroMTotal = seguroM1 + seguroM2;

    // especieTotal: total retribución en especie (vivienda + seguro médico empresa)
    // Este importe va a 640 "en especie" (no B.IRPF ESP, que solo es la base tributable)
    var especieTotal = vivienda + seguroMTotal;

    // baseExenta: resto de retribución dineraria no sujeta a IRPF
    var baseExenta = totBruto - irpfDin - especieTotal - irpfIrr;

    var empleado = {
      numero:      numEmpleadoStr,
      departamento: departamento,
      centro:      centro,
      totBruto:    totBruto,
      totalLiq:    parseValue(row[colIndices.totalLiq]),
      ssEmpresa:   parseValue(row[colIndices.ssEmpresa]),
      ssTotal:     parseValue(row[colIndices.ssTotal]),
      irpfDin:     irpfDin,
      irpfEsp:     irpfEsp,
      irpfIrr:     irpfIrr,
      difSala:     parseValue(row[colIndices.difSala]),
      seguroMTotal: seguroMTotal,
      // seguroS: aportación del trabajador al seguro médico (va a 7550000002 en el haber)
      seguroS:     seguroS,
      vivienda:    vivienda,
      especieTotal: especieTotal,
      baseExenta:  baseExenta,
      dietas:      dietas,
      anticipo:    anticipo,
      devPrestamo:  colIndices.devPrestamo >= 0 ? parseValue(row[colIndices.devPrestamo]) : 0,
      retIrpfDin:   colIndices.retIrpfDin >= 0 ? parseValue(row[colIndices.retIrpfDin]) : 0,
      retIrpfEsp:   colIndices.retIrpfEsp >= 0 ? parseValue(row[colIndices.retIrpfEsp]) : 0
    };

    empleados.push(empleado);
  }

  if (empleados.length === 0) {
    throw new Error('No se encontraron datos de empleados en el archivo.');
  }

  // 5. Calcular distribución y totales IRPF
  var dist = calcularDistribucion(empleados);
  var irpfTotales = {
    din: round2(empleados.reduce(function(s, e) { return s + e.retIrpfDin; }, 0)),
    esp: round2(empleados.reduce(function(s, e) { return s + e.retIrpfEsp; }, 0))
  };

  // 6. Generar asiento
  var asientoData = generarDatosAsiento(empleados, fecha, referencia, diario);

  // 7. Escribir en la pestaña Asiento (asiento + distribución)
  writeAsientoToSheet(asientoData, dist, irpfTotales);

  // 8. Actualizar histórico
  var totBrutoTotal = empleados.reduce(function(s, e) { return s + e.totBruto; }, 0);
  var totalLiqTotal = empleados.reduce(function(s, e) { return s + e.totalLiq; }, 0);
  addHistorico({
    fecha: fecha,
    referencia: referencia,
    diario: diario,
    empleados: empleados.length,
    totalBruto: round2(totBrutoTotal),
    totalLiquido: round2(totalLiqTotal),
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    empleados: empleados.length,
    totalBruto: round2(totBrutoTotal),
    totalLiquido: round2(totalLiqTotal),
    sinDBList: sinDBList,
    lineas: asientoData.length,
    dist: dist,
    irpfTotales: irpfTotales
  };
}

function calcularDistribucion(empleados) {
  var dist = {
    depts:   { c640: {}, c642: {} },
    centros: { c640: {}, c642: {} },
    totales: { c640: 0, c642: 0 }
  };

  for (var i = 0; i < empleados.length; i++) {
    var emp = empleados[i];
    // 640: totBruto (= irpfDin + especieTotal + irpfIrr + baseExenta)
    var imp640 = emp.totBruto;
    var imp642 = emp.ssEmpresa;

    dist.totales.c640 += imp640;
    dist.totales.c642 += imp642;

    var dept = String(emp.departamento);
    dist.depts.c640[dept] = (dist.depts.c640[dept] || 0) + imp640;
    dist.depts.c642[dept] = (dist.depts.c642[dept] || 0) + imp642;

    // Centro(s): puede haber varios separados por espacios
    var centros = String(emp.centro).split(/\s+/).filter(function(c) { return c && !isNaN(c) && parseInt(c) > 0; }).map(Number);
    if (centros.length === 0) {
      var n = parseInt(emp.centro);
      if (n > 0) centros = [n];
    }
    if (centros.length === 0) continue;

    var factor = 1 / centros.length;
    for (var j = 0; j < centros.length; j++) {
      var ck = String(centros[j]);
      dist.centros.c640[ck] = (dist.centros.c640[ck] || 0) + imp640 * factor;
      dist.centros.c642[ck] = (dist.centros.c642[ck] || 0) + imp642 * factor;
    }
  }

  return dist;
}

function generarDatosAsiento(empleados, fecha, referencia, diario) {
  var totales = empleados.reduce(function(acc, emp) {
    return {
      irpfDin:      acc.irpfDin      + emp.irpfDin,
      irpfIrr:      acc.irpfIrr      + emp.irpfIrr,
      especieTotal: acc.especieTotal + emp.especieTotal,
      baseExenta:   acc.baseExenta   + emp.baseExenta,
      ssEmpresa:    acc.ssEmpresa    + emp.ssEmpresa,
      ssTotal:      acc.ssTotal      + emp.ssTotal,
      difSala:      acc.difSala      + emp.difSala,
      seguroMTotal: acc.seguroMTotal + emp.seguroMTotal,
      seguroS:      acc.seguroS      + emp.seguroS,
      vivienda:     acc.vivienda     + emp.vivienda
    };
  }, { irpfDin: 0, irpfIrr: 0, especieTotal: 0, baseExenta: 0, ssEmpresa: 0, ssTotal: 0, difSala: 0, seguroMTotal: 0, seguroS: 0, vivienda: 0 });

  var asiento = [];

  // 640 - Sueldos y salarios (DEBE)
  if (totales.irpfDin > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 6400000000,
    etiqueta: 'Sueldos y salarios (dinerarios)',
    debe: round2(totales.irpfDin), haber: null,
    impuestos: 'Retenciones IRPF (Trabajadores) dinerarios'
  });

  // 640 en especie = vivienda + seguroMTotal (total retribución en especie de la empresa)
  if (totales.especieTotal > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 6400000000,
    etiqueta: 'Sueldos y salarios (en especie)',
    debe: round2(totales.especieTotal), haber: null,
    impuestos: 'Retenciones IRPF (Trabajadores) en especie'
  });

  if (totales.irpfIrr > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 6400000000,
    etiqueta: 'Sueldos y salarios (irregulares)',
    debe: round2(totales.irpfIrr), haber: null,
    impuestos: 'Retenciones IRPF (Trabajadores) dinerarios'
  });

  if (totales.baseExenta > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 6400000000,
    etiqueta: 'Sueldos y salarios (exentos)',
    debe: round2(totales.baseExenta), haber: null,
    impuestos: null
  });

  // 642 - Seguridad Social empresa (DEBE)
  if (totales.ssEmpresa > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 6420000000,
    etiqueta: 'Seguridad Social a cargo empresa',
    debe: round2(totales.ssEmpresa), haber: null,
    impuestos: null
  });

  // 476 - SS acreedora (HABER)
  if (totales.ssTotal > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 4760000000,
    etiqueta: 'Seguridad Social acreedora',
    debe: null, haber: round2(totales.ssTotal),
    impuestos: null
  });

  // 7550000001 - Póliza convenio / DIF SALA (HABER)
  if (totales.difSala > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 7550000001,
    etiqueta: 'Póliza convenio',
    debe: null, haber: round2(totales.difSala),
    impuestos: null
  });

  // 7550000002 - Seguro médico (HABER)
  // Incluye aportación empresa (SEGURO M) + aportación trabajador (0755-Seguro S)
  var totalSeguro = round2(totales.seguroMTotal + totales.seguroS);
  if (totalSeguro > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 7550000002,
    etiqueta: 'Seguro médico',
    debe: null, haber: totalSeguro,
    impuestos: null
  });

  // 7550000003 - Vivienda (HABER)
  if (totales.vivienda > 0) asiento.push({
    fecha: fecha, referencia: referencia, diario: diario,
    cuenta: 7550000003,
    etiqueta: 'Vivienda',
    debe: null, haber: round2(totales.vivienda),
    impuestos: null
  });

  // Por empleado: 465xxxxxxxx (HABER) y 254xxxxxxxx (HABER)
  for (var i = 0; i < empleados.length; i++) {
    var emp = empleados[i];
    var cuenta465 = 4650000000 + parseInt(emp.numero);

    if (emp.totalLiq > 0) asiento.push({
      fecha: fecha, referencia: referencia, diario: diario,
      cuenta: cuenta465,
      etiqueta: 'Nómina Emp. ' + emp.numero,
      debe: null, haber: round2(emp.totalLiq),
      impuestos: null
    });

    // Dietas: anticipo ya pagado con anterioridad → Haber 465
    if (emp.dietas > 0) asiento.push({
      fecha: fecha, referencia: referencia, diario: diario,
      cuenta: cuenta465,
      etiqueta: 'Anticipo Dietas Emp. ' + emp.numero,
      debe: null, haber: round2(emp.dietas),
      impuestos: null
    });

    // Anticipo neto: parte del anticipo no cubierta por dietas → Haber 465
    var anticipoNeto = emp.anticipo - emp.dietas;
    if (anticipoNeto > 0) asiento.push({
      fecha: fecha, referencia: referencia, diario: diario,
      cuenta: cuenta465,
      etiqueta: 'Anticipo Emp. ' + emp.numero,
      debe: null, haber: round2(anticipoNeto),
      impuestos: null
    });

    // Devolución préstamo → Haber 254xxxxxxxx
    if (emp.devPrestamo > 0) {
      var cuenta254 = 2540000000 + parseInt(emp.numero);
      asiento.push({
        fecha: fecha, referencia: referencia, diario: diario,
        cuenta: cuenta254,
        etiqueta: 'Devolución préstamo Emp. ' + emp.numero,
        debe: null, haber: round2(emp.devPrestamo),
        impuestos: null
      });
    }
  }

  return asiento;
}
