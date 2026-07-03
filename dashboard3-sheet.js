// Conector en vivo a la hoja "Dashboard3" (Gestión Promocional) del mismo Sheet.
// Se pide por nombre de pestaña (gviz) en vez de por gid: a diferencia de las
// otras pestañas, esta no tiene fila de título fusionada, así que el
// encabezado real ya está en la fila 0.
'use strict';

const PROMO_SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
const PROMO_SHEET_NAME = 'Dashboard3';
const PROMO_CSV_URL = `https://docs.google.com/spreadsheets/d/${PROMO_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(PROMO_SHEET_NAME)}`;
const PROMO_PLAZA = 'oaxaca';

// Parser real de CSV (no split por coma): "Meta" y "Uds Totales" traen comas de miles entre comillas.
function parsePromoCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') { /* ignorado, \n cierra la fila */ }
    else if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function num(s) { return parseFloat(String(s).replace(/,/g, '')) || 0; }
function pct(s) { return parseFloat(String(s).replace('%', '')) || 0; }

async function loadPromoData() {
  const res = await fetch(PROMO_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet respondió ${res.status}`);
  const rows = parsePromoCSV(await res.text());

  const header = rows[0];
  const col = name => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
  const iPeriodo = col('Gestion Promocional Periodo'), iSemana = col('Semana'), iPlaza = col('Plaza'),
        iAsesor = col('Asesor Tienda'), iCr = col('CR y TIENDA'), iPromo = col('Promocion'),
        iUds = col('Uds Totales'), iMeta = col('Meta'), iFaltante = col('Faltante'),
        iAvance = col('% AVANCE PERIODO');

  const FILAS = rows.slice(1)
    .filter(r => r.length > iAvance && (r[iPlaza] || '').toLowerCase().includes(PROMO_PLAZA))
    .map(r => {
      const [cr, ...resto] = (r[iCr] || '').split(' - ');
      return {
        periodo: r[iPeriodo], semana: r[iSemana], asesor: r[iAsesor],
        cr: cr.trim(), tienda: resto.join(' - ').trim(), promo: r[iPromo],
        uds: num(r[iUds]), meta: num(r[iMeta]), faltante: num(r[iFaltante]),
        avance: pct(r[iAvance]),
      };
    });

  const PROMOS = [...new Set(FILAS.map(f => f.promo))];
  const PERIODO = FILAS[0] ? `Periodo ${FILAS[0].periodo} · Semana ${FILAS[0].semana}` : '';

  return { FILAS, PROMOS, PERIODO };
}
