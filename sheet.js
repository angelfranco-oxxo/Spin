// Conector en vivo a la hoja "Tableros Spin" (Google Sheets, publicada como CSV).
// No hay columnas fijas por índice: se leen por nombre de encabezado, así que
// si alguien reordena o agrega columnas en el Sheet, esto no se rompe.
'use strict';

const SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
const SHEET_GID = '0';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const PLAZA = 'oaxaca'; // filtro defensivo por si la hoja crece a más plazas

function parseCSV(text) {
  return text.trim().split('\n').map(row => row.split(',').map(c => c.replace(/\r$/, '').trim()));
}

function pct(s) { return parseFloat(String(s).replace('%', '').trim()) || 0; }
function num(s) { return parseFloat(s) || 0; }

async function loadSheetData() {
  const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet respondió ${res.status}`);
  const rows = parseCSV(await res.text());

  const header = rows[1]; // fila 0 = título fusionado "SPIN CUENTAS NUEVAS"; fila 1 = encabezados reales
  const col = name => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
  const iAsesor = col('Asesor'), iPlaza = col('Plaza'), iCr = col('Cr Tienda'),
        iNombre = col('Nombre Tienda'), iMeta = col('Meta'), iNuevas = col('Cuentas nuevas'),
        iAvance = col('% Cum vs Meta (Total'), iRepos = col('Reposiciones'),
        iEstatus = col('Estatus Total'), iAfil7 = col('Afiliaciones 7 días');

  const TIENDAS = rows.slice(2)
    .filter(r => r.length > iAvance && (r[iPlaza] || '').toLowerCase().includes(PLAZA))
    .map(r => ({
      cr: r[iCr], tienda: r[iNombre], asesor: r[iAsesor],
      meta: Math.round(num(r[iMeta])), nuevas: Math.round(num(r[iNuevas])),
      avance: +pct(r[iAvance]).toFixed(1),
      repos: Math.round(num(r[iRepos])), afil7: Math.round(num(r[iAfil7])),
      estatus: (r[iEstatus] || '').trim(),
    }));

  const porAsesor = {};
  TIENDAS.forEach(t => {
    if (!porAsesor[t.asesor]) porAsesor[t.asesor] = { asesor: t.asesor, tiendas: 0, meta: 0, nuevas: 0, repos: 0, afil7: 0, cumplen: 0 };
    const a = porAsesor[t.asesor];
    a.tiendas++; a.meta += t.meta; a.nuevas += t.nuevas; a.repos += t.repos; a.afil7 += t.afil7;
    if (t.estatus === 'CUMPLE') a.cumplen++;
  });
  const ASESORES = Object.values(porAsesor).map(a => ({ ...a, avance: +(a.nuevas / a.meta * 100).toFixed(1) }));

  TIENDAS.sort((a, b) => b.avance - a.avance);
  ASESORES.sort((a, b) => b.avance - a.avance);
  return { ASESORES, TIENDAS };
}
