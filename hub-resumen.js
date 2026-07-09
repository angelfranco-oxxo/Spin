// Resumen en vivo del hub: una métrica clave por dashboard, leída del mismo
// Google Sheet que usa cada tablero. Todo ponderado (sum real / sum meta),
// nunca promedio simple de porcentajes.
'use strict';

(function () {
  const SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
  const byGid = gid => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const byName = name => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

  function parseCSV(text) {
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(Boolean));
  }

  const num = s => parseFloat(String(s ?? '').replace(/[$,%\s]/g, '')) || 0;

  // Busca la columna cuyo encabezado empieza con `name` (tolerante a sufijos).
  function col(header, name) {
    const n = name.toLowerCase();
    return header.findIndex(h => String(h).trim().toLowerCase().startsWith(n));
  }

  async function fetchRows(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Sheet respondió ${res.status}`);
    return parseCSV(await res.text());
  }

  function filterPlaza(rows, iPlaza) {
    return iPlaza < 0 ? rows : rows.filter(r => String(r[iPlaza] || '').toLowerCase().includes('oaxaca'));
  }

  // Cada loader regresa { pct, sub } — pct para el número grande y la barra.
  const loaders = {
    async rd1() { // Cuentas Nuevas (gid=0, encabezados en fila 1)
      const rows = await fetchRows(byGid('0'));
      const h = rows[1];
      const iPlaza = col(h, 'Plaza'), iMeta = col(h, 'Meta'), iNuevas = col(h, 'Cuentas nuevas');
      const data = filterPlaza(rows.slice(2), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const nuevas = data.reduce((s, r) => s + num(r[iNuevas]), 0);
      return { pct: meta ? nuevas / meta * 100 : 0, sub: `${nuevas.toLocaleString('es-MX')} de ${meta.toLocaleString('es-MX')} cuentas` };
    },
    async rd2() { // Spin Premia (gid=362013280): % tiendas que cumplen meta Tráfico
      const rows = await fetchRows(byGid('362013280'));
      const h = rows[1];
      const iPlaza = col(h, 'Plaza'), iAvance = col(h, 'Avance Meta TX PREMIA');
      const data = filterPlaza(rows.slice(2), iPlaza);
      const cumplen = data.filter(r => num(r[iAvance]) >= 100).length;
      return { pct: data.length ? cumplen / data.length * 100 : 0, sub: `${cumplen} de ${data.length} tiendas en meta Tráfico` };
    },
    async rd3() { // Gestión Promocional
      const rows = await fetchRows(byName('Dashboard3'));
      const h = rows[0];
      const iPlaza = col(h, 'Plaza'), iUds = col(h, 'Uds Totales'), iMeta = col(h, 'Meta');
      const data = filterPlaza(rows.slice(1), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const uds = data.reduce((s, r) => s + num(r[iUds]), 0);
      const faltan = Math.max(0, meta - uds);
      return { pct: meta ? uds / meta * 100 : 0, sub: `${faltan.toLocaleString('es-MX')} unidades faltantes` };
    },
    async rd4() { // Venta Sugerida
      const rows = await fetchRows(byName('Dashboard4'));
      const h = rows[0];
      const iPlaza = col(h, 'Plaza'), iReal = col(h, 'AVANCE PAQUETES'), iMeta = col(h, 'META PAQUETES VS');
      const data = filterPlaza(rows.slice(1), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const real = data.reduce((s, r) => s + num(r[iReal]), 0);
      const faltan = Math.max(0, meta - real);
      return { pct: meta ? real / meta * 100 : 0, sub: `${faltan.toLocaleString('es-MX')} paquetes faltantes` };
    },
    async rd5() { // Cruzada Andatti: proyección + crecimiento vs mes anterior
      const rows = await fetchRows(byName('Dashboard5'));
      const h = rows[0];
      const iPlaza = col(h, 'Plaza'), iProy = col(h, 'Proy Uds'), iMeta = col(h, 'Meta Total Mensual'),
            iAct = col(h, 'Unidades MActual'), iAnt = col(h, 'Unidades MAAnt');
      const data = filterPlaza(rows.slice(1), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const proy = data.reduce((s, r) => s + num(r[iProy]), 0);
      const act = data.reduce((s, r) => s + num(r[iAct]), 0);
      const ant = data.reduce((s, r) => s + num(r[iAnt]), 0);
      const crec = ant > 0 ? (act - ant) / ant * 100 : null;
      const sub = crec === null ? 'proyección al cierre'
        : `${crec >= 0 ? '+' : ''}${crec.toFixed(1)}% vs mes anterior`;
      return { pct: meta ? proy / meta * 100 : 0, sub };
    },
  };

  function paint(id, r) {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.dash-metric-val').textContent = r.pct.toFixed(1) + '%';
    el.querySelector('.dash-metric-sub').textContent = r.sub;
    el.querySelector('.dash-metric-bar i').style.width = Math.min(r.pct, 100) + '%';
  }

  function paintError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.dash-metric-val').textContent = '—';
    el.querySelector('.dash-metric-sub').textContent = 'sin conexión al Sheet';
  }

  Object.entries(loaders).forEach(([id, fn]) => {
    fn().then(r => paint(id, r)).catch(() => paintError(id));
  });
})();
