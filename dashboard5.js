// Dashboard 5 · Plaza Oaxaca
// Generic indicator dashboard fed by dashboard5-sheet.js.
'use strict';

const nf = n => n.toLocaleString('es-MX');
const AZUL = '#6D28D9', AZUL2 = '#A78BFA', AZUL_CLARO = '#DCD0F7';
const FONT = "'Barlow Condensed',Helvetica,Arial,sans-serif";
let gid = 0;

function donutSVG(pctReal, size = 108, tip = '') {
  const r = 42, c = 2 * Math.PI * r, capped = Math.max(0, Math.min(pctReal, 100));
  const offset = c * (1 - capped / 100);
  const cx = size / 2, cy = size / 2, id = 'd5g' + (gid++);
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
  const gradId = 'd5bg' + (gid++);
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

function bucketsFor() {
  return [
    { lbl: '1–49%',  test: v => v > 0 && v < 50,  color: '#D6331B' },
    { lbl: '50–74%', test: v => v >= 50 && v < 75, color: '#A78BFA' },
    { lbl: '75–99%', test: v => v >= 75 && v < 100, color: '#7C6FC4' },
    { lbl: '100%+',  test: v => v >= 100,           color: AZUL },
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

loadDashboard5Data()
  .then(({ FILAS: f, INDICADORES: p, PERIODO: per }) => { FILAS = f; INDICADORES = p; PERIODO = per; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja Dashboard5</div><div class="foot">${err.message}. Verifica nombre de pestaña, columnas y permisos.</div></div>`;
  });

let indicador = '', texto = '', modalAsesor = null, modalTexto = '';

function filasDeIndicador(ind) { return FILAS.filter(f => f.indicador === ind); }

function asesoresDeIndicador(ind) {
  const rows = filasDeIndicador(ind);
  const by = {};
  rows.forEach(r => {
    if (!by[r.asesor]) by[r.asesor] = { asesor: r.asesor, tiendas: 0, real: 0, actual: 0, udsAnt: 0, meta: 0 };
    const a = by[r.asesor];
    a.tiendas++; a.real += r.real; a.actual += r.actual; a.udsAnt += r.udsAnt; a.meta += r.meta;
  });
  return Object.values(by).map(a => ({ ...a, avance: +(a.meta ? a.real / a.meta * 100 : 0).toFixed(1) }));
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
  const tot = tiendas.reduce(
    (s, t) => ({ real: s.real + t.real, actual: s.actual + t.actual, udsAnt: s.udsAnt + t.udsAnt, meta: s.meta + t.meta }),
    { real: 0, actual: 0, udsAnt: 0, meta: 0 }
  );
  const n = tiendas.length || 1;
  const avancePonderado = tot.meta ? tot.real / tot.meta * 100 : 0;
  const avanceReal = tot.meta ? tot.actual / tot.meta * 100 : 0;
  const cumplen = tiendas.filter(t => t.avance >= 100).length;
  const dia = tiendas[0]?.dia || 0, ultDia = tiendas[0]?.ultDia || 30;
  const crecPct = tot.udsAnt > 0 ? (tot.actual - tot.udsAnt) / tot.udsAnt * 100 : null;
  const crecColor = crecPct === null ? '#6B6B6B' : crecPct >= 0 ? AZUL : '#D6331B';
  const crecTxt = crecPct === null ? 'Sin dato previo' : (crecPct >= 0 ? '+' : '') + crecPct.toFixed(1) + '%';

  kpisEl.innerHTML = `
    <div class="kpi hero kpi-donut">
      <div>
        <div class="lbl">Proyección al cierre</div>
        <div class="foot">Ponderado plaza · ${PERIODO || 'Cruzada Andatti'}</div>
      </div>
      ${donutSVG(avancePonderado, 108, `Proyección ponderada\n${avancePonderado.toFixed(1)}% de ${nf(tot.meta)} meta\n(Avance real a hoy: ${avanceReal.toFixed(1)}%)`)}
    </div>
    <div class="kpi">
      <div class="lbl">Unidades acumuladas</div>
      <div class="val">${nf(tot.actual)}</div>
      <div class="foot">de ${nf(tot.meta)} meta · día ${dia}/${ultDia}</div>
    </div>
    <div class="kpi">
      <div class="lbl">Tiendas en meta proy.</div>
      <div class="val">${cumplen}<small class="vs"> / ${n}</small></div>
      <div class="foot">${(cumplen / n * 100).toFixed(1)}% proyectan cumplir</div>
    </div>
    <div class="kpi">
      <div class="lbl">Crec. vs mes anterior</div>
      <div class="val" style="color:${crecColor}">${crecTxt}</div>
      <div class="foot">${nf(tot.actual)} vs ${nf(tot.udsAnt)} uds ant.</div>
    </div>`;

  const ranked = [...asesores].sort((a, b) => b.avance - a.avance);
  const maxBar = Math.max(100, ...ranked.map(a => a.avance));
  chartEl.innerHTML = ranked.length ? barChartSVG(ranked, { value: a => a.avance, max: maxBar, suffix: '%' }) : '<div class="empty">Sin datos para este indicador.</div>';

  const valores = tiendas.map(t => t.avance);
  const buckets = bucketsFor().map(b => ({ ...b, count: valores.filter(b.test).length }));
  distDonutEl.innerHTML = `${multiDonutSVG(buckets)}
    <div class="legend">${buckets.map(b => `<div class="legend-row"><span class="legend-dot" style="background:${b.color}"></span>${b.lbl}<span class="legend-count" style="color:${b.color}">${b.count}</span></div>`).join('')}</div>`;
  distHintEl.textContent = `Reparto de las ${tiendas.length} tiendas para ${indicador || 'Cruzada Andatti'}.`;

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
