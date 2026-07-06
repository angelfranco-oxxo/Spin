// Live connector for the "Dashboard5" tab: Cruzada Andatti.
'use strict';

const DASH5_SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
const DASH5_SHEET_NAME = 'Dashboard5';
const DASH5_CSV_URL = `https://docs.google.com/spreadsheets/d/${DASH5_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(DASH5_SHEET_NAME)}`;
const DASH5_PLAZA = 'oaxaca';

function parseDashboard5CSV(text) {
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

function dash5Num(value) {
  return parseFloat(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, '')) || 0;
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

async function loadDashboard5Data() {
  const res = await fetch(DASH5_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet respondio ${res.status}`);
  const rows = parseDashboard5CSV(await res.text()).filter(r => r.some(Boolean));
  if (rows.length < 2) throw new Error('La hoja Dashboard5 no tiene datos suficientes');

  const header = rows[0];
  const iPeriodo = findCol(header, ['Cruzada Andatti Mes', 'Periodo']);
  const iPlaza = findCol(header, ['Plaza.', 'Plaza']);
  const iAsesor = findCol(header, ['Asesor Nombre', 'Asesor', 'Asesor Tienda']);
  const iTienda = findCol(header, ['Tienda']);
  const iActualUds = findCol(header, ['Unidades MActual']);
  const iProyUds = findCol(header, ['Proy Uds']);
  const iMetaMensual = findCol(header, ['Meta Total Mensual']);
  const iAvance = findCol(header, ['%Cump (Proy uds vs meta mensual)', '% Cump', '% Cumplimiento']);
  const iDia = findCol(header, ['DayofMonth']);
  const iUltimoDia = findCol(header, ['Ultimo dia mes']);

  if (iAsesor < 0 || iTienda < 0 || iProyUds < 0 || iMetaMensual < 0) {
    throw new Error('Faltan columnas base de Cruzada Andatti en Dashboard5');
  }

  const FILAS = rows.slice(1)
    .filter(r => iPlaza < 0 || String(getCell(r, iPlaza)).toLowerCase().includes(DASH5_PLAZA))
    .map(r => {
      const proy = dash5Num(getCell(r, iProyUds));
      const meta = dash5Num(getCell(r, iMetaMensual));
      const avance = iAvance >= 0 ? dash5Num(getCell(r, iAvance)) : (meta ? proy / meta * 100 : 0);
      return {
        periodo: getCell(r, iPeriodo),
        semana: iDia >= 0 && iUltimoDia >= 0 ? `Dia ${getCell(r, iDia)} de ${getCell(r, iUltimoDia)}` : '',
        asesor: getCell(r, iAsesor) || 'Sin asesor',
        cr: getCell(r, iTienda + 1),
        tienda: getCell(r, iTienda) || 'Sin tienda',
        indicador: 'Cruzada Andatti',
        real: proy,
        actual: dash5Num(getCell(r, iActualUds)),
        meta,
        avance: +avance.toFixed(1),
      };
    });

  const INDICADORES = ['Cruzada Andatti'];
  const PERIODO = FILAS[0] ? [FILAS[0].periodo && `Mes ${FILAS[0].periodo}`, FILAS[0].semana].filter(Boolean).join(' · ') : '';
  return { FILAS, INDICADORES, PERIODO };
}
