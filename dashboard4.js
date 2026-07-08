// Dashboard 4 · Plaza Oaxaca
// Generic indicator dashboard fed by dashboard4-sheet.js.
'use strict';

const nf = n => n.toLocaleString('es-MX');
const AZUL = '#15803D', AZUL2 = '#4ADE80', AZUL_CLARO = '#B9EAC7';
const FONT = "'Barlow Condensed',Helvetica,Arial,sans-serif";
let gid = 0;

function donutSVG(pctReal, size = 108, tip = '') {
  const r = 42, c = 2 * Math.PI * r, capped = Math.max(0, Math.min(pctReal, 100));
  const offset = c * (1 - capped / 100);
  const cx = size / 2, cy = size / 2, id = 'd4g' + (gid++);
  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${AZUL2}"/><stop offset="100%" stop-color="${AZUL}"/>
    </linearGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(10,10,10,.08)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${cx} ${cy})"${tip ? ` data-tip="${tip.replace(/"/g, '&quot;')}"` : ''}/>
    <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="${FONT}"
      font-weight="800" font-size="25" fill="#14110E">${pctReal.toFixed(0)}%</text>
  </svg>`;
}

function barChartSVG(items, { value, max, suffix = '%' }) {
  const n = Math.max(items.length, 1);
  const colW = 136, barW = 44, chartH = 210, padTop = 34, labelH = 78, sideGap = 40;
  const w = n * colW + sideGap * 2, h = padTop + chartH + labelH;
  const gradId = 'd4bg' + (gid++);
  const metaY = max > 100 ? padTop + chartH * (1 - 100 / max) : null;
  const baseY = padTop + chartH;
  const bars = items.map((it, i) => {
    const val = value(it), bh = Math.max(3, (Math.min(val, max) / max) * chartH);
    const x = sideGap + i * colW + (colW - barW) / 2, cx = x + barW / 2, y = baseY - bh;
    const nombre = it.asesor.split(' ')[0] || 'Asesor';
    const tip = `${it.asesor}\n${val.toFixed(1)}${suffix} · ${it.tiendas} tiendas`.replace(/"/g, '&quot;');
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="9"
        fill="${i < 3 ? `url(#${gradId})` : AZUL_CLARO}" data-tip="${tip}" style="cursor:pointer"/>
      <text x="${cx}" y="${y - 9}" text-anchor="middle" font-family="${FONT}"
        font-size="12.5" font-weight="700" fill="${AZUL}">${val.toFixed(1)}${suffix}</text>
      <text x="${cx - 4}" y="${baseY + 15}" text-anchor="end" font-family="${FONT}"
        font-size="12.5" font-weight="700" fill="#14110E"
        transform="rotate(-30 ${cx - 4} ${baseY + 15})">${nombre}</text>`;
  }).join('');
  const metaLine = metaY != null
    ? `<line x1="${sideGap - 10}" y1="${metaY}" x2="${w - sideGap + 10}" y2="${metaY}"
        stroke="#14110E" stroke-width="1.3" stroke-dasharray="4 4" opacity=".45"/>
       <text x="${w - sideGap + 10}" y="${metaY - 6}" text-anchor="end" font-family="${FONT}"
        font-size="10" font-weight="700" fill="#6B6B6B">META</text>`
    : '';
  return `<svg class="bar-chart-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs><linearGradient id="${gradId}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${AZUL}"/><stop offset="100%" stop-color="${AZUL2}"/>
    </linearGradient></defs>
    <line x1="${sideGap - 10}" y1="${baseY}" x2="${w - sideGap + 10}" y2="${baseY}" stroke="rgba(10,10,10,.12)" stroke-width="1"/>
    ${metaLine}
    ${bars}
  </svg>`;
}

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

function bucketsFor(values) {
  return [
    { lbl: 'Cumple meta (100%)', test: v => v >= 100, color: AZUL },
    { lbl: '70-99%', test: v => v >= 70 && v < 100, color: '#5CAF7C' },
    { lbl: '< 70%', test: v => v < 70, color: '#D6331B' },
  ];
}

function miniRowHTML(t, i, isTop) {
  return `
    <div class="mini-row">
      <div class="mini-badge${isTop ? ' up' : ''}">${i + 1}</div>
      <div class="mini-info">
        <div class="mini-name">${t.tienda}</div>
        <div class="mini-sub">${t.asesor}</div>
      </div>
      <div class="mini-val${isTop ? '' : ' low'}">${t.avance.toFixed(1)}%</div>
    </div>`;
}

let FILAS = [], INDICADORES = [], PERIODO = '';
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), tabsEl = $('metricTabs'), chartEl = $('chart'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar'), hintEl = $('hint');
const distDonutEl = $('distDonut'), distHintEl = $('distHint'), topListEl = $('topList'), bottomListEl = $('bottomList');
const modalOverlay = $('modalOverlay'), modalTitle = $('modalTitle'), modalSub = $('modalSub'),
      modalClose = $('modalClose'), modalBuscar = $('modalBuscar'), modalListEl = $('modalList');

const chartTip = $('chartTip');
function moveTip(e) { chartTip.style.left = e.clientX + 'px'; chartTip.style.top = e.clientY + 'px'; }
document.body.addEventListener('mousemove', e => {
  const el = e.target.closest('[data-tip]');
  if (el) { chartTip.textContent = el.dataset.tip; chartTip.hidden = false; moveTip(e); }
  else { chartTip.hidden = true; }
});

kpisEl.innerHTML = `<div class="kpi"><div class="lbl">Conectando con Sheets...</div></div>`;

loadDashboard4Data()
  .then(({ FILAS: f, INDICADORES: p, PERIODO: per }) => { FILAS = f; INDICADORES = p; PERIODO = per; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja Dashboard4</div><div class="foot">${err.message}. Verifica nombre de pestaña, columnas y permisos.</div></div>`;
  });

let indicador = '', texto = '', modalAsesor = null, modalTexto = '';

function filasDeIndicador(ind) { return FILAS.filter(f => f.indicador === ind); }

function asesoresDeIndicador(ind) {
  const rows = filasDeIndicador(ind);
  const by = {};
  rows.forEach(r => {
    if (!by[r.asesor]) by[r.asesor] = { asesor: r.asesor, tiendas: 0, real: 0, meta: 0, sumAvance: 0 };
    const a = by[r.asesor];
    a.tiendas++; a.real += r.real; a.meta += r.meta; a.sumAvance += r.avance;
  });
  return Object.values(by).map(a => ({ ...a, avance: +(a.sumAvance / a.tiendas).toFixed(1) }));
}

function rowHTML(d, i, isAsesor) {
  return `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}${isAsesor ? ' clicable' : ''}"${isAsesor ? ` data-asesor="${d.asesor.replace(/"/g, '&quot;')}"` : ''}>
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${isAsesor ? d.asesor : d.tienda}</div><div class="ainfo">${isAsesor ? `${d.tiendas} tiendas` : `${d.cr} · ${d.asesor}`}</div></div>
      <div class="gtrack"><i style="width:${Math.min(d.avance, 100)}%;background:linear-gradient(90deg,${AZUL2},${AZUL})"></i></div>
      <div class="aav" style="color:${AZUL}">${d.avance.toFixed(1)}%</div>
      <div class="acnt">${nf(d.real)}/${nf(d.meta)}</div>
    </div>`;
}

function init() {
  tabsEl.innerHTML = INDICADORES.map((p, i) => `<button class="tab mtab${i === 0 ? ' on' : ''}" data-p="${p.replace(/"/g, '&quot;')}">${p}</button>`).join('');
  indicador = INDICADORES[0] || '';
  tabsEl.querySelectorAll('.mtab').forEach(tb => tb.addEventListener('click', () => {
    if (tb.dataset.p === indicador) return;
    tabsEl.querySelectorAll('.mtab').forEach(x => x.classList.toggle('on', x === tb));
    indicador = tb.dataset.p;
    texto = '';
    buscar.value = '';
    render();
  }));
  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });
  render();
}

function render() {
  const tiendas = filasDeIndicador(indicador);
  const asesores = asesoresDeIndicador(indicador);
  const tot = tiendas.reduce((s, t) => ({ real: s.real + t.real, meta: s.meta + t.meta, avance: s.avance + t.avance }),
    { real: 0, meta: 0, avance: 0 });
  const n = tiendas.length || 1;
  const avgAvance = tot.avance / n;
  const cumplen = tiendas.filter(t => t.avance >= 100).length;

  kpisEl.innerHTML = `
    <div class="kpi hero kpi-donut">
      <div>
        <div class="lbl">${indicador || 'Dashboard 4'} - Avance</div>
        <div class="foot">Promedio de la plaza vs. meta${PERIODO ? ' · ' + PERIODO : ''}</div>
      </div>
      ${donutSVG(avgAvance, 108, `Avance ${indicador}\n${avgAvance.toFixed(1)}% promedio de ${n} tiendas`)}
    </div>
    <div class="kpi"><div class="lbl">Resultado vs Meta</div><div class="val">${nf(tot.real)}</div><div class="foot">de ${nf(tot.meta)} meta</div></div>
    <div class="kpi"><div class="lbl">Tiendas en meta</div><div class="val">${cumplen}</div><div class="foot">de ${tiendas.length} tiendas</div></div>
    <div class="kpi"><div class="lbl">Cobertura</div><div class="val">${asesores.length}<small class="vs"> asesores</small></div><div class="foot">${tiendas.length} tiendas · Plaza Oaxaca</div></div>`;

  const ranked = [...asesores].sort((a, b) => b.avance - a.avance);
  chartEl.innerHTML = ranked.length ? barChartSVG(ranked, { value: a => a.avance, max: 100, suffix: '%' }) : '<div class="empty">Sin datos para este indicador.</div>';

  const valores = tiendas.map(t => t.avance);
  const buckets = bucketsFor(valores).map(b => ({ ...b, count: valores.filter(b.test).length }));
  distDonutEl.innerHTML = `${multiDonutSVG(buckets)}
    <div class="legend">${buckets.map(b => `<div class="legend-row"><span class="legend-dot" style="background:${b.color}"></span>${b.lbl}<span class="legend-count" style="color:${b.color}">${b.count}</span></div>`).join('')}</div>`;
  distHintEl.textContent = `Reparto de las ${tiendas.length} tiendas para ${indicador || 'Dashboard 4'}.`;

  const sortedT = [...tiendas].sort((a, b) => b.avance - a.avance);
  topListEl.innerHTML = sortedT.slice(0, 3).map((t, i) => miniRowHTML(t, i, true)).join('');
  bottomListEl.innerHTML = sortedT.slice(-3).reverse().map((t, i) => miniRowHTML(t, i, false)).join('');

  hintEl.textContent = 'Un tile por asesor. Clic en un asesor para ver el detalle de sus tiendas.';
  let arr = asesores.filter(a => !texto || a.asesor.toLowerCase().includes(texto));
  arr = [...arr].sort((a, b) => b.avance - a.avance);
  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((d, i) => rowHTML(d, i, true)).join('');
}

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
  const tiendas = filasDeIndicador(indicador).filter(t => t.asesor === modalAsesor &&
    (!modalTexto || `${t.tienda} ${t.cr}`.toLowerCase().includes(modalTexto)));
  const sorted = [...tiendas].sort((a, b) => b.avance - a.avance);
  modalSub.textContent = `${tiendas.length} tiendas · indicador: ${indicador}`;
  modalListEl.innerHTML = sorted.length
    ? sorted.map((t, i) => rowHTML(t, i, false)).join('')
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
