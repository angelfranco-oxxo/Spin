// Dashboard SPIN BY OXXO · Avance Spin Premia · Plaza Oaxaca
// Datos en vivo desde premia-sheet.js. Gráficos: SVG a mano, sin librerías.
'use strict';

const nf = n => n.toLocaleString('es-MX');
const AZUL = '#0033A0', AZUL2 = '#00C2D1', AZUL_CLARO = '#B9CDF0';
const FONT = "'Barlow Condensed',Helvetica,Arial,sans-serif";
let gid = 0;

// ---------- donut (gauge circular) ----------
// pct: valor real (puede pasar de 100). El anillo se limita visualmente a 100%;
// el número en el centro siempre muestra el valor real.
function donutSVG(pctReal, size = 108, tip = '') {
  const r = 42, c = 2 * Math.PI * r, capped = Math.max(0, Math.min(pctReal, 100));
  const offset = c * (1 - capped / 100);
  const cx = size / 2, cy = size / 2, id = 'dg' + (gid++);
  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${AZUL2}"/><stop offset="100%" stop-color="${AZUL}"/>
    </linearGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(10,10,10,.08)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${cx} ${cy})"${tip ? ` data-tip="${tip.replace(/"/g, '&quot;')}"` : ''} style="cursor:default"/>
    <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="${FONT}"
      font-weight="800" font-size="25" fill="#14110E">${pctReal.toFixed(0)}%</text>
  </svg>`;
}

// ---------- ranking vertical (columna por asesor) ----------
function barChartSVG(items, { value, max, suffix = '%' }) {
  const n = items.length;
  const colW = 136, barW = 44;          // separacion minima para que valores y nombres no se encimen
  const chartH = 210, padTop = 34, labelH = 78, sideGap = 40;
  const w = n * colW + sideGap * 2, h = padTop + chartH + labelH;
  const gradId = 'bg' + (gid++);
  const metaY = max > 100 ? padTop + chartH * (1 - 100 / max) : null;
  const baseY = padTop + chartH;

  const bars = items.map((it, i) => {
    const val = value(it), bh = Math.max(3, (Math.min(val, max) / max) * chartH);
    const x = sideGap + i * colW + (colW - barW) / 2, cx = x + barW / 2, y = baseY - bh;
    const nombre = it.asesor.split(' ')[0]; // solo el nombre de pila: cabe sin encimarse entre columnas
    const tip = `${it.asesor}\n${val.toFixed(1)}${suffix} · ${it.tiendas} tiendas`.replace(/"/g, '&quot;');
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="9"
        fill="${i < 3 ? `url(#${gradId})` : AZUL_CLARO}" data-tip="${tip}" style="cursor:pointer"/>
      <text x="${cx}" y="${y - 9}" text-anchor="middle" font-family="${FONT}"
        font-size="12.5" font-weight="700" fill="${AZUL}" style="pointer-events:none">${val.toFixed(1)}${suffix}</text>
      <text x="${cx - 4}" y="${baseY + 15}" text-anchor="end" font-family="${FONT}"
        font-size="12.5" font-weight="700" fill="#14110E" style="pointer-events:none"
        transform="rotate(-30 ${cx - 4} ${baseY + 15})">${nombre}</text>`;
  }).join('');

  const metaLine = metaY != null
    ? `<line x1="${sideGap - 10}" y1="${metaY}" x2="${w - sideGap + 10}" y2="${metaY}"
        stroke="#14110E" stroke-width="1.3" stroke-dasharray="4 4" opacity=".45"/>
       <text x="${w - sideGap + 10}" y="${metaY - 6}" text-anchor="end" font-family="${FONT}"
        font-size="10" font-weight="700" fill="#6B6B6B">META</text>`
    : '';

  return `<svg class="bar-chart-svg" viewBox="0 0 ${w} ${h}" width="100%" style="height:auto;display:block" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="${gradId}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${AZUL}"/><stop offset="100%" stop-color="${AZUL2}"/>
    </linearGradient></defs>
    <line x1="${sideGap - 10}" y1="${baseY}" x2="${w - sideGap + 10}" y2="${baseY}" stroke="rgba(10,10,10,.12)" stroke-width="1"/>
    ${metaLine}
    ${bars}
  </svg>`;
}

// ---------- dona multi-segmento (distribución) ----------
function multiDonutSVG(segments, size = 132) {
  const r = 50, c = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let acc = 0;
  const arcs = segments.filter(s => s.count > 0).map(seg => {
    const len = c * (seg.count / total);
    const dash = `${Math.max(len - 1.5, 0)} ${c - Math.max(len - 1.5, 0)}`;
    const offset = -acc;
    acc += len;
    const tip = `${seg.lbl}\n${seg.count} tiendas · ${(seg.count / total * 100).toFixed(0)}% del total`;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="18"
      stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${cx} ${cy})" data-tip="${tip}" style="cursor:pointer"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(10,10,10,.06)" stroke-width="18"/>
    ${arcs}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="26" fill="#14110E">${total}</text>
    <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-family="Barlow,sans-serif" font-size="10" fill="#6B6B6B">tiendas</text>
  </svg>`;
}

// Buckets por métrica: Tráfico usa la meta real (100%/70%) que da la hoja;
// Servicios y Afiliaciones no tienen meta en el Sheet, así que se dividen
// en terciles reales de la propia distribución (dato, no un umbral inventado).
function bucketsFor(key, values) {
  if (key === 'avanceTrafico') {
    return [
      { lbl: 'Cumple meta (≥100%)', test: v => v >= 100, color: AZUL },
      { lbl: '70–99%', test: v => v >= 70 && v < 100, color: '#7C93C4' },
      { lbl: '< 70%', test: v => v < 70, color: '#D6331B' },
    ];
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length / 3)];
  const q2 = sorted[Math.floor(sorted.length * 2 / 3)];
  return [
    { lbl: 'Tercio alto', test: v => v >= q2, color: AZUL },
    { lbl: 'Tercio medio', test: v => v >= q1 && v < q2, color: '#7C93C4' },
    { lbl: 'Tercio bajo', test: v => v < q1, color: '#D6331B' },
  ];
}

function miniRowHTML(t, i, m, isTop) {
  return `
    <div class="mini-row">
      <div class="mini-badge${isTop ? ' up' : ''}">${i + 1}</div>
      <div class="mini-info">
        <div class="mini-name">${t.tienda}</div>
        <div class="mini-sub">${t.asesor}</div>
      </div>
      <div class="mini-val${isTop ? '' : ' low'}">${t[m.key].toFixed(1)}%</div>
    </div>`;
}

let ASESORES = [], TIENDAS = [];
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), chartEl = $('chart'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar'), hintEl = $('hint');
const distDonutEl = $('distDonut'), topListEl = $('topList'), bottomListEl = $('bottomList');

// ---------- tooltip flotante, reusado por todas las gráficas SVG ----------
// Cualquier elemento con [data-tip] muestra su contenido al pasar el cursor.
const chartTip = $('chartTip');
function bindTooltips(root) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mouseenter', e => {
      chartTip.textContent = el.dataset.tip;
      chartTip.hidden = false;
      moveTip(e);
    });
    el.addEventListener('mousemove', moveTip);
    el.addEventListener('mouseleave', () => { chartTip.hidden = true; });
  });
}
function moveTip(e) {
  chartTip.style.left = e.clientX + 'px';
  chartTip.style.top = e.clientY + 'px';
}

kpisEl.innerHTML = `<div class="kpi"><div class="lbl">Conectando con Sheets…</div></div>`;

loadPremiaData()
  .then(({ ASESORES: a, TIENDAS: t }) => { ASESORES = a; TIENDAS = t; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja</div><div class="foot">${err.message}. Verifica que siga compartida como "Cualquiera con el enlace".</div></div>`;
  });

const METRICAS = {
  trafico: { lbl: 'Tráfico', key: 'avanceTrafico', max: 150, suffix: '%' },
  servicios: { lbl: 'Servicios / Telefonía', key: 'pctServicios', max: 60, suffix: '%' },
  afiliaciones: { lbl: 'Afiliaciones', key: 'conversion', max: 100, suffix: '%' },
};
let metrica = 'trafico', texto = '';

// Plantilla de fila, compartida entre la lista principal y el modal.
// isAsesor: el objeto es un asesor (tile clicable, abre el modal de sus tiendas).
function rowHTML(d, i, m, isAsesor) {
  return `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}${isAsesor ? ' clicable' : ''}"${isAsesor ? ` data-asesor="${d.asesor.replace(/"/g, '&quot;')}"` : ''}>
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${isAsesor ? d.asesor : d.tienda}</div><div class="ainfo">${isAsesor ? `${d.tiendas} tiendas` : `${d.cr} · ${d.asesor}`}</div></div>
      <div class="gtrack"><i style="width:${Math.min(d[m.key], m.max) / m.max * 100}%;background:linear-gradient(90deg,${AZUL2},${AZUL})"></i>
        ${m.key === 'avanceTrafico' ? `<span style="left:${100 / m.max * 100}%"></span>` : ''}</div>
      <div class="aav" style="color:${AZUL}">${d[m.key].toFixed(1)}%</div>
      <div class="acnt">${!isAsesor && m.key === 'avanceTrafico' ? d.pctTrafico + '% / ' + d.metaTrafico + '%'
                        : m.key === 'conversion' ? d.afiliaciones + '/' + d.registros : ''}</div>
    </div>`;
}

function init() {
  const tot = TIENDAS.reduce((s, t) => ({
    avanceTraf: s.avanceTraf + t.avanceTrafico, pctServ: s.pctServ + t.pctServicios,
    reg: s.reg + t.registros, afil: s.afil + t.afiliaciones,
  }), { avanceTraf: 0, pctServ: 0, reg: 0, afil: 0 });
  const n = TIENDAS.length;
  const avgAvanceTraf = tot.avanceTraf / n, avgPctServ = tot.pctServ / n;
  const conversion = tot.reg ? tot.afil / tot.reg * 100 : 0;

  kpisEl.innerHTML = `
    <div class="kpi hero kpi-donut">
      <div>
        <div class="lbl">Tráfico — Avance Meta</div>
        <div class="foot">Promedio de la plaza vs. la meta de Tráfico (100%)</div>
      </div>
      ${donutSVG(avgAvanceTraf, 108, `Avance Meta Tráfico\n${avgAvanceTraf.toFixed(1)}% promedio de ${n} tiendas`)}
    </div>
    <div class="kpi kpi-donut">
      <div>
        <div class="lbl">Afiliaciones — Conversión</div>
        <div class="foot">${nf(tot.afil)} de ${nf(tot.reg)} registros</div>
      </div>
      ${donutSVG(conversion, 108, `Conversión de Afiliaciones\n${nf(tot.afil)} afiliaciones de ${nf(tot.reg)} registros`)}
    </div>
    <div class="kpi">
      <div class="lbl">Servicios / Telefonía</div>
      <div class="val">${avgPctServ.toFixed(1)}%</div>
      <div class="foot">% TX Premia promedio de la plaza</div>
    </div>
    <div class="kpi">
      <div class="lbl">Cobertura</div>
      <div class="val">${ASESORES.length}<small class="vs"> asesores</small></div>
      <div class="foot">${n} tiendas · Plaza Oaxaca</div>
    </div>`;
  bindTooltips(kpisEl);

  document.querySelectorAll('.mtab').forEach(tb => tb.addEventListener('click', () => {
    if (tb.dataset.m === metrica) return;
    document.querySelectorAll('.mtab').forEach(x => x.classList.toggle('on', x === tb));
    metrica = tb.dataset.m;
    render();
  }));
  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });

  render();
}

function render() {
  const m = METRICAS[metrica];
  const ranked = [...ASESORES].sort((a, b) => b[m.key] - a[m.key]);
  chartEl.innerHTML = barChartSVG(ranked, { value: a => a[m.key], max: m.max, suffix: m.suffix });
  bindTooltips(chartEl);

  // Distribución de las 257 tiendas para la métrica activa.
  const valores = TIENDAS.map(t => t[m.key]);
  const buckets = bucketsFor(m.key, valores).map(b => ({ ...b, count: valores.filter(b.test).length }));
  distDonutEl.innerHTML = `
    ${multiDonutSVG(buckets)}
    <div class="legend">${buckets.map(b => `
      <div class="legend-row"><span class="legend-dot" style="background:${b.color}"></span>${b.lbl}<span class="legend-count" style="color:${b.color}">${b.count}</span></div>`).join('')}
    </div>`;
  bindTooltips(distDonutEl);

  // Top / bottom 3 tiendas para la métrica activa.
  const sortedT = [...TIENDAS].sort((a, b) => b[m.key] - a[m.key]);
  topListEl.innerHTML = sortedT.slice(0, 3).map((t, i) => miniRowHTML(t, i, m, true)).join('');
  bottomListEl.innerHTML = sortedT.slice(-3).reverse().map((t, i) => miniRowHTML(t, i, m, false)).join('');

  hintEl.textContent = 'Un tile por asesor (promedio de sus tiendas). Clic en un asesor para ver el detalle de sus tiendas.';

  let arr = ASESORES.filter(a => !texto || a.asesor.toLowerCase().includes(texto));
  arr = [...arr].sort((a, b) => b[m.key] - a[m.key]);

  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((d, i) => rowHTML(d, i, m, true)).join('');
}

// ---------- modal: tiendas de un asesor ----------
const modalOverlay = $('modalOverlay'), modalTitle = $('modalTitle'), modalSub = $('modalSub'),
      modalClose = $('modalClose'), modalBuscar = $('modalBuscar'), modalListEl = $('modalList');
let modalAsesor = null, modalTexto = '';

function openModal(asesorNombre) {
  modalAsesor = asesorNombre; modalTexto = ''; modalBuscar.value = '';
  modalTitle.textContent = asesorNombre;
  renderModal();
  modalOverlay.hidden = false;
  document.body.classList.add('modal-open');
  modalBuscar.focus();
}
function closeModal() {
  modalOverlay.hidden = true;
  document.body.classList.remove('modal-open');
}
function renderModal() {
  const m = METRICAS[metrica];
  const tiendas = TIENDAS.filter(t => t.asesor === modalAsesor &&
    (!modalTexto || `${t.tienda} ${t.cr}`.toLowerCase().includes(modalTexto)));
  const sorted = [...tiendas].sort((a, b) => b[m.key] - a[m.key]);
  modalSub.textContent = `${tiendas.length} tiendas · métrica: ${m.lbl}`;
  modalListEl.innerHTML = sorted.length
    ? sorted.map((t, i) => rowHTML(t, i, m, false)).join('')
    : '<div class="empty">Sin tiendas con ese filtro.</div>';
}

listEl.addEventListener('click', e => {
  const row = e.target.closest('.arow[data-asesor]');
  if (row) openModal(row.dataset.asesor);
});
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modalOverlay.hidden) closeModal(); });
modalBuscar.addEventListener('input', () => { modalTexto = modalBuscar.value.trim().toLowerCase(); renderModal(); });
