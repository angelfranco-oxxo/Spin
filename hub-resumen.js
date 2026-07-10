// Resumen en vivo del hub: una métrica clave por dashboard + gráficas
// comparativas, leídas del mismo Google Sheet que usa cada tablero.
// Todo ponderado (sum real / sum meta), nunca promedio simple de %.
'use strict';

(function () {
  const SHEET_ID = '1CD6CMak2MrkmhDtbkE_6_amoH-MR4YBEmof2OIxy2bE';
  const byGid = gid => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const byName = name => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  const FONT = "'Barlow Condensed',Helvetica,Arial,sans-serif";

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
  const nf = n => Math.round(n).toLocaleString('es-MX');

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

  // Cada loader regresa { pct, sub } y opcionalmente datos extra para gráficas.
  const loaders = {
    async rd1() { // Cuentas Nuevas (gid=0, encabezados en fila 1)
      const rows = await fetchRows(byGid('0'));
      const h = rows[1];
      const iPlaza = col(h, 'Plaza'), iMeta = col(h, 'Meta'), iNuevas = col(h, 'Cuentas nuevas');
      const data = filterPlaza(rows.slice(2), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const nuevas = data.reduce((s, r) => s + num(r[iNuevas]), 0);
      return { pct: meta ? nuevas / meta * 100 : 0, sub: `${nf(nuevas)} de ${nf(meta)} cuentas` };
    },
    async rd2() { // Spin Premia: % tiendas que cumplen meta Tráfico
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
      return { pct: meta ? uds / meta * 100 : 0, sub: `${nf(Math.max(0, meta - uds))} unidades faltantes` };
    },
    async rd4() { // Venta Sugerida + serie semanal S1-S5
      const rows = await fetchRows(byName('Dashboard4'));
      const h = rows[0];
      const iPlaza = col(h, 'Plaza'), iReal = col(h, 'AVANCE PAQUETES'), iMeta = col(h, 'META PAQUETES VS');
      const data = filterPlaza(rows.slice(1), iPlaza);
      const meta = data.reduce((s, r) => s + num(r[iMeta]), 0);
      const real = data.reduce((s, r) => s + num(r[iReal]), 0);
      const semanas = ['S1', 'S2', 'S3', 'S4', 'S5'].map(s => {
        const i = h.findIndex(x => String(x).trim().toUpperCase() === s);
        return i < 0 ? 0 : data.reduce((a, r) => a + num(r[i]), 0);
      });
      return { pct: meta ? real / meta * 100 : 0, sub: `${nf(Math.max(0, meta - real))} paquetes faltantes`, semanas };
    },
    async rd5() { // Cruzada Andatti: proyección + comparativo mensual
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
      return {
        pct: meta ? proy / meta * 100 : 0,
        sub: crec === null ? 'proyección al cierre' : `${crec >= 0 ? '+' : ''}${crec.toFixed(1)}% vs mes anterior`,
        andatti: { ant, act, proy, meta },
      };
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

  /* ── Gráficas ─────────────────────────────────────────────── */

  const DASH_META = [
    { id: 'rd1', lbl: 'Cuentas Nuevas', color: '#0033A0' },
    { id: 'rd2', lbl: 'Spin Premia', color: '#0E7490' },
    { id: 'rd3', lbl: 'G. Promocional', color: '#B45309' },
    { id: 'rd4', lbl: 'Venta Sugerida', color: '#15803D' },
    { id: 'rd5', lbl: 'Cruzada Andatti', color: '#6D28D9' },
  ];

  // Barras horizontales: avance ponderado de los 5 tableros, línea de meta en 100%.
  function chartAvance(results) {
    const items = DASH_META.filter(d => results[d.id]);
    if (!items.length) return '';
    const rowH = 34, padT = 8, labW = 108, valW = 52, w = 460;
    const h = padT + items.length * rowH + 14;
    const trackW = w - labW - valW;
    const maxV = Math.max(110, ...items.map(d => results[d.id].pct));
    const metaX = labW + trackW * (100 / maxV);
    const bars = items.map((d, i) => {
      const v = results[d.id].pct;
      const y = padT + i * rowH;
      const bw = Math.max(3, trackW * (Math.min(v, maxV) / maxV));
      return `
        <text x="${labW - 10}" y="${y + 17}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="700" fill="#14110E">${d.lbl}</text>
        <rect x="${labW}" y="${y + 5}" width="${trackW}" height="14" rx="7" fill="rgba(10,10,10,.07)"/>
        <rect x="${labW}" y="${y + 5}" width="${bw}" height="14" rx="7" fill="${d.color}"/>
        <text x="${labW + trackW + 8}" y="${y + 17}" font-family="${FONT}" font-size="13.5" font-weight="800" fill="${d.color}">${v.toFixed(1)}%</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="height:auto;display:block">
      ${bars}
      <line x1="${metaX}" y1="${padT - 3}" x2="${metaX}" y2="${padT + items.length * rowH}" stroke="#14110E" stroke-width="1.2" stroke-dasharray="4 4" opacity=".4"/>
      <text x="${metaX}" y="${padT + items.length * rowH + 12}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" fill="#6B6B6B">META 100%</text>
    </svg>`;
  }

  // Línea semanal S1-S5 de Venta Sugerida.
  function chartSemanal(semanas) {
    if (!semanas || !semanas.some(v => v > 0)) return '';
    const w = 460, h = 150, padX = 34, padT = 22, padB = 26;
    const maxV = Math.max(...semanas), minV = Math.min(...semanas);
    const span = (maxV - minV) || 1;
    const stepX = (w - padX * 2) / (semanas.length - 1);
    const ys = semanas.map(v => padT + (h - padT - padB) * (1 - (v - minV) / span));
    const pts = semanas.map((v, i) => `${padX + i * stepX},${ys[i]}`).join(' ');
    const dots = semanas.map((v, i) => `
      <circle cx="${padX + i * stepX}" cy="${ys[i]}" r="4.5" fill="#15803D"/>
      <text x="${padX + i * stepX}" y="${ys[i] - 10}" text-anchor="middle" font-family="${FONT}" font-size="11.5" font-weight="800" fill="#15803D">${nf(v)}</text>
      <text x="${padX + i * stepX}" y="${h - 6}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#6B6B6B">S${i + 1}</text>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="height:auto;display:block">
      <polyline points="${pts}" fill="none" stroke="#4ADE80" stroke-width="2.5" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  // Andatti: mes anterior vs actual vs proyección, con línea de meta.
  function chartAndatti(a) {
    if (!a || !a.meta) return '';
    const bars = [
      { lbl: 'Mes anterior', v: a.ant, color: '#C4B5FD' },
      { lbl: 'Mes actual', v: a.act, color: '#8B5CF6' },
      { lbl: 'Proyección', v: a.proy, color: '#6D28D9' },
    ];
    const w = 460, h = 168, padB = 26, padT = 24, colW = w / bars.length, barW = 64;
    const maxV = Math.max(a.meta, ...bars.map(b => b.v)) * 1.08;
    const baseY = h - padB;
    const metaY = padT + (baseY - padT) * (1 - a.meta / maxV);
    const rects = bars.map((b, i) => {
      const bh = Math.max(3, (baseY - padT) * (b.v / maxV));
      const x = i * colW + (colW - barW) / 2;
      return `
        <rect x="${x}" y="${baseY - bh}" width="${barW}" height="${bh}" rx="8" fill="${b.color}"/>
        <text x="${x + barW / 2}" y="${baseY - bh - 7}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="800" fill="#14110E">${nf(b.v)}</text>
        <text x="${x + barW / 2}" y="${h - 8}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#6B6B6B">${b.lbl}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="height:auto;display:block">
      ${rects}
      <line x1="8" y1="${metaY}" x2="${w - 8}" y2="${metaY}" stroke="#14110E" stroke-width="1.2" stroke-dasharray="4 4" opacity=".45"/>
      <text x="${w - 8}" y="${metaY - 5}" text-anchor="end" font-family="${FONT}" font-size="10" font-weight="700" fill="#6B6B6B">META ${nf(a.meta)}</text>
    </svg>`;
  }

  function setChart(id, svg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg || '<div class="hub-chart-empty">Sin datos disponibles.</div>';
  }

  /* ── Carga ────────────────────────────────────────────────── */

  const results = {};
  Promise.allSettled(
    Object.entries(loaders).map(([id, fn]) =>
      fn().then(r => { results[id] = r; paint(id, r); })
        .catch(() => paintError(id))
    )
  ).then(() => {
    setChart('chartAvance', chartAvance(results));
    setChart('chartSemanal', chartSemanal(results.rd4 && results.rd4.semanas));
    setChart('chartAndatti', chartAndatti(results.rd5 && results.rd5.andatti));
  });
})();
