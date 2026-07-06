// Live connector for the "Dashboard4" tab in the same Google Sheet.
// The parser is intentionally flexible while the tab structure settles:
// it accepts common advisor/store/metric column names and exposes normalized rows.
'use strict';

const DASH4_SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
const DASH4_SHEET_NAME = 'Dashboard4';
const DASH4_CSV_URL = `https://docs.google.com/spreadsheets/d/${DASH4_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(DASH4_SHEET_NAME)}`;
const DASH4_PLAZA = 'oaxaca';

function parseDashboard4CSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function dash4Num(value) {
  return parseFloat(String(value ?? '').replace(/,/g, '').replace('%', '')) || 0;
}

function findCol(header, names) {
  const normalized = header.map(h => String(h).trim().toLowerCase());
  return names.reduce((found, name) => {
    if (found >= 0) return found;
    return normalized.findIndex(h => h === name.toLowerCase());
  }, -1);
}

function getCell(row, idx) {
  return idx >= 0 ? row[idx] : '';
}

async function loadDashboard4Data() {
  const res = await fetch(DASH4_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet respondio ${res.status}`);
  const rows = parseDashboard4CSV(await res.text()).filter(r => r.some(Boolean));
  if (rows.length < 2) throw new Error('La hoja Dashboard4 no tiene datos suficientes');

  const header = rows[0];
  const iPlaza = findCol(header, ['Plaza', 'Plaza Tienda', 'Nombre Plaza']);
  const iAsesor = findCol(header, ['Asesor', 'Asesor Tienda', 'ATS', 'Nombre Asesor']);
  const iCrTienda = findCol(header, ['CR y TIENDA', 'CR Tienda', 'Tienda', 'Nombre Tienda']);
  const iCr = findCol(header, ['CR', 'CR_TIENDA']);
  const iIndicador = findCol(header, ['Indicador', 'Metrica', 'Métrica', 'Concepto']);
  const iReal = findCol(header, ['Real', 'Resultado', 'Actual', 'Uds Totales', 'Cuentas nuevas', 'AVANCE PAQUETES']);
  const iMeta = findCol(header, ['Meta', 'Objetivo', 'META PAQUETES VS']);
  const iAvance = findCol(header, ['% Avance', '% AVANCE', 'Avance %', '% Cumplimiento', '% AVANCE PERIODO']);
  const iPeriodo = findCol(header, ['Periodo', 'Gestion Periodo', 'Gestión Periodo']);
  const iSemana = findCol(header, ['Semana']);

  if (iAsesor < 0 || iCrTienda < 0) throw new Error('Faltan columnas de asesor o tienda en Dashboard4');

  const FILAS = rows.slice(1)
    .filter(r => iPlaza < 0 || String(getCell(r, iPlaza)).toLowerCase().includes(DASH4_PLAZA))
    .map(r => {
      const crTienda = getCell(r, iCrTienda);
      const [crFromName, ...storeParts] = String(crTienda).split(' - ');
      const meta = dash4Num(getCell(r, iMeta));
      const real = dash4Num(getCell(r, iReal));
      const avance = iAvance >= 0 ? dash4Num(getCell(r, iAvance)) : (meta ? real / meta * 100 : 0);
      return {
        periodo: getCell(r, iPeriodo),
        semana: getCell(r, iSemana),
        asesor: getCell(r, iAsesor) || 'Sin asesor',
        cr: getCell(r, iCr) || crFromName.trim(),
        tienda: storeParts.join(' - ').trim() || crTienda || 'Sin tienda',
        indicador: getCell(r, iIndicador) || 'Venta Sugerida',
        real,
        meta,
        avance: +avance.toFixed(1),
      };
    });

  const INDICADORES = [...new Set(FILAS.map(f => f.indicador).filter(Boolean))];
  const PERIODO = FILAS[0] ? [FILAS[0].periodo && `Periodo ${FILAS[0].periodo}`, FILAS[0].semana && `Semana ${FILAS[0].semana}`].filter(Boolean).join(' · ') : '';

  return { FILAS, INDICADORES, PERIODO };
}
