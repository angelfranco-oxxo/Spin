// Conector en vivo a la hoja "Dashboard2" (Avance Spin Premia) del mismo Sheet.
// Igual que sheet.js: columnas por nombre de encabezado, no por índice.
'use strict';

const PREMIA_SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
const PREMIA_GID = '362013280';
const PREMIA_CSV_URL = `https://docs.google.com/spreadsheets/d/${PREMIA_SHEET_ID}/export?format=csv&gid=${PREMIA_GID}`;
const PREMIA_PLAZA = 'oaxaca';

function parsePremiaCSV(text) {
  return text.trim().split('\n').map(row => row.split(',').map(c => c.replace(/\r$/, '').trim()));
}
function pct(s) { return parseFloat(String(s).replace('%', '')) || 0; }
function num(s) { return parseFloat(String(s).replace(/,/g, '')) || 0; }

async function loadPremiaData() {
  const res = await fetch(PREMIA_CSV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet respondió ${res.status}`);
  const rows = parsePremiaCSV(await res.text());

  const header = rows[1];
  const col = name => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iZona = col('Zona'), iPlaza = col('Plaza'), iAsesor = col('Asesor'), iCr = col('Cr Tienda'),
        iTienda = col('Nombre Tienda'), iRankTraf = col('Rank TX Premia (Tráfico)'),
        iPctTraf = col('% TX PREMIA (Tráfico)'), iMetaTraf = col('% Meta TX Premia'),
        iAvanceTraf = col('Avance Meta TX PREMIA'), iRankServ = col('Rank TX Servicios/ Tel'),
        iPctServ = col('% TX PREMIA Servicios/ Telefonía'), iRankAfil = col('RANK Afiliaciones'),
        iRegistros = col('Registros'), iAfiliaciones = col('Afiliaciones');

  const TIENDAS = rows.slice(2)
    .filter(r => r.length > iAfiliaciones && (r[iPlaza] || '').toLowerCase().includes(PREMIA_PLAZA))
    .map(r => {
      const registros = num(r[iRegistros]), afiliaciones = num(r[iAfiliaciones]);
      return {
        zona: r[iZona], asesor: r[iAsesor], cr: r[iCr], tienda: r[iTienda],
        rankTrafico: num(r[iRankTraf]), pctTrafico: pct(r[iPctTraf]), metaTrafico: pct(r[iMetaTraf]),
        avanceTrafico: pct(r[iAvanceTraf]), rankServicios: num(r[iRankServ]), pctServicios: pct(r[iPctServ]),
        rankAfiliaciones: num(r[iRankAfil]), registros, afiliaciones,
        conversion: registros ? +(afiliaciones / registros * 100).toFixed(1) : 0,
      };
    });

  const porAsesor = {};
  TIENDAS.forEach(t => {
    if (!porAsesor[t.asesor]) porAsesor[t.asesor] = {
      asesor: t.asesor, tiendas: 0, sumPctTrafico: 0, sumAvanceTrafico: 0, sumPctServicios: 0,
      registros: 0, afiliaciones: 0,
    };
    const a = porAsesor[t.asesor];
    a.tiendas++; a.sumPctTrafico += t.pctTrafico; a.sumAvanceTrafico += t.avanceTrafico;
    a.sumPctServicios += t.pctServicios; a.registros += t.registros; a.afiliaciones += t.afiliaciones;
  });
  const ASESORES = Object.values(porAsesor).map(a => ({
    asesor: a.asesor, tiendas: a.tiendas,
    pctTrafico: +(a.sumPctTrafico / a.tiendas).toFixed(1),
    avanceTrafico: +(a.sumAvanceTrafico / a.tiendas).toFixed(1),
    pctServicios: +(a.sumPctServicios / a.tiendas).toFixed(1),
    registros: a.registros, afiliaciones: a.afiliaciones,
    conversion: a.registros ? +(a.afiliaciones / a.registros * 100).toFixed(1) : 0,
  }));

  return { ASESORES, TIENDAS };
}
