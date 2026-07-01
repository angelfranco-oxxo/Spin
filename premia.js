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
function donutSVG(pctReal, size = 108) {
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
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="${FONT}"
      font-weight="800" font-size="25" fill="#14110E">${pctReal.toFixed(0)}%</text>
  </svg>`;
}

// ---------- ranking horizontal (barra por asesor) ----------
function barChartSVG(items, { value, max, suffix = '%' }) {
  const labelW = 168, chartW = 360, rowH = 30, padTop = 6;
  const w = labelW + chartW + 60, h = items.length * rowH + padTop * 2;
  const metaX = max > 100 ? labelW + (100 / max) * chartW : null;
  const gradId = 'bg' + (gid++);
  const bars = items.map((it, i) => {
    const y = padTop + i * rowH, cy = y + rowH / 2 - 6;
    const val = value(it), bw = Math.max(2, (Math.min(val, max) / max) * chartW);
    const nombre = it.asesor.length > 22 ? it.asesor.slice(0, 21) + '…' : it.asesor;
    return `
      <text x="${labelW - 10}" y="${cy + 9}" text-anchor="end" font-family="${FONT}"
        font-size="13" font-weight="700" fill="#14110E">${nombre}</text>
      <rect x="${labelW}" y="${cy}" width="${bw}" height="14" rx="7" fill="${i < 3 ? `url(#${gradId})` : AZUL_CLARO}"/>
      <text x="${labelW + bw + 8}" y="${cy + 11}" font-family="${FONT}"
        font-size="13" font-weight="700" fill="${AZUL}">${val.toFixed(1)}${suffix}</text>`;
  }).join('');
  const metaLine = metaX ? `<line x1="${metaX}" y1="${padTop - 2}" x2="${metaX}" y2="${h - padTop + 2}"
      stroke="#14110E" stroke-width="1.5" opacity=".5"/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${AZUL2}"/><stop offset="100%" stop-color="${AZUL}"/>
    </linearGradient></defs>
    ${bars}${metaLine}</svg>`;
}

let ASESORES = [], TIENDAS = [];
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), chartEl = $('chart'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar'), hintEl = $('hint');

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
// Vista de detalle: por defecto "asesor" (~10 tiles) para no volcar las 257
// tiendas sueltas de una vez; "tienda" queda como opción explícita.
const VISTAS = {
  asesor: {
    data: () => ASESORES,
    name: a => a.asesor, sub: a => `${a.tiendas} tiendas`,
    text: a => a.asesor.toLowerCase(), placeholder: 'Buscar asesor…',
  },
  tienda: {
    data: () => TIENDAS,
    name: t => t.tienda, sub: t => `${t.cr} · ${t.asesor}`,
    text: t => `${t.tienda} ${t.asesor} ${t.cr}`.toLowerCase(), placeholder: 'Buscar tienda o asesor…',
  },
};
let metrica = 'trafico', vista = 'asesor', texto = '';

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
      ${donutSVG(avgAvanceTraf)}
    </div>
    <div class="kpi kpi-donut">
      <div>
        <div class="lbl">Afiliaciones — Conversión</div>
        <div class="foot">${nf(tot.afil)} de ${nf(tot.reg)} registros</div>
      </div>
      ${donutSVG(conversion)}
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

  document.querySelectorAll('.mtab').forEach(tb => tb.addEventListener('click', () => {
    if (tb.dataset.m === metrica) return;
    document.querySelectorAll('.mtab').forEach(x => x.classList.toggle('on', x === tb));
    metrica = tb.dataset.m;
    render();
  }));
  document.querySelectorAll('.vtab').forEach(tb => tb.addEventListener('click', () => {
    if (tb.dataset.v === vista) return;
    document.querySelectorAll('.vtab').forEach(x => x.classList.toggle('on', x === tb));
    vista = tb.dataset.v; texto = ''; buscar.value = '';
    render();
  }));
  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });

  render();
}

function render() {
  const m = METRICAS[metrica];
  const ranked = [...ASESORES].sort((a, b) => b[m.key] - a[m.key]);
  chartEl.innerHTML = barChartSVG(ranked, { value: a => a[m.key], max: m.max, suffix: m.suffix });

  const v = VISTAS[vista];
  hintEl.textContent = vista === 'asesor'
    ? 'Un tile por asesor (promedio de sus tiendas). Cambia a "Por Tienda" para el detalle completo.'
    : 'Detalle de las 257 tiendas de la plaza para la métrica seleccionada.';
  buscar.placeholder = v.placeholder;

  let arr = v.data().filter(d => !texto || v.text(d).includes(texto));
  arr = [...arr].sort((a, b) => b[m.key] - a[m.key]);

  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((d, i) => rowHTML(d, i, m, vista === 'asesor')).join('');
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
