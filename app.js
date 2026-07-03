// Dashboard SPIN BY OXXO · Plaza Oaxaca
// Datos en vivo desde Google Sheets (ver sheet.js). Avance = Cuentas nuevas ÷ Meta.
'use strict';

const ESCALA = 115; // tope visual de la barra: la meta (100%) queda casi al final
const nf = n => n.toLocaleString('es-MX');
// Color como identificador, no decoración: azul = en meta o cerca, bermellón = alerta, gris = inactivo.
// El gradiente es solo brillo de superficie (vidrio); la familia de color no cambia.
const color = a => a >= 100 ? '#0033A0' : a >= 70 ? '#3A5A9C' : a > 0 ? '#D6331B' : '#6B6B6B';
const fill  = a => a >= 100 ? 'linear-gradient(90deg,#00C2D1,#0033A0)'
             : a >= 70  ? 'linear-gradient(90deg,#9CB0DE,#7C93C4)'
             : a > 0    ? 'linear-gradient(90deg,#E2523A,#D6331B)'
             : '#D8D8D8';

const buckets = [
  { k: 'meta',  lbl: 'Cumplen meta', test: a => a.avance >= 100,                 bg: '#0033A0' },
  { k: 'cerca', lbl: '70–99%',       test: a => a.avance >= 70 && a.avance < 100, bg: '#7C93C4' },
  { k: 'bajo',  lbl: '1–69%',        test: a => a.avance > 0 && a.avance < 70,     bg: '#D6331B' },
  { k: 'cero',  lbl: 'Sin altas',    test: a => a.avance <= 0,                     bg: '#D8D8D8' },
];
const marca100 = 100 / ESCALA * 100;
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), distEl = $('dist'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar'), orden = $('orden'), hintEl = $('hint'), asesorFilter = $('asesorFilter');
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

// ---------- dona multi-segmento (distribución por estatus) ----------
function multiDonutSVG(segments, size = 132) {
  const r = 50, c = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let acc = 0;
  const arcs = segments.filter(s => s.count > 0).map(seg => {
    const len = c * (seg.count / total);
    const dash = `${Math.max(len - 1.5, 0)} ${c - Math.max(len - 1.5, 0)}`;
    const offset = -acc;
    acc += len;
    const tip = `${seg.lbl}\n${seg.count} · ${(seg.count / total * 100).toFixed(0)}% del total`;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.bg}" stroke-width="18"
      stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${cx} ${cy})" data-tip="${tip}" style="cursor:pointer"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(10,10,10,.06)" stroke-width="18"/>
    ${arcs}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-family="var(--font-display)" font-weight="800" font-size="26" fill="#14110E">${total}</text>
    <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-family="var(--font-body)" font-size="10" fill="#6B6B6B">${total === 1 ? 'item' : 'items'}</text>
  </svg>`;
}

function miniRowHTML(t, i, isTop) {
  return `
    <div class="mini-row">
      <div class="mini-badge${isTop ? ' up' : ''}">${i + 1}</div>
      <div class="mini-info">
        <div class="mini-name">${t.tienda}</div>
        <div class="mini-sub">${t.asesor}</div>
      </div>
      <div class="mini-val${isTop ? '' : ' low'}">${t.avance}%</div>
    </div>`;
}

function tiendaRowHTML(t, i) {
  const tip = `${t.tienda}\n${t.cr} - ${t.asesor}\n${t.avance}% - ${nf(t.nuevas)}/${nf(t.meta)}`.replace(/"/g, '&quot;');
  return `
    <div class="arow" data-tip="${tip}">
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${t.tienda}</div><div class="ainfo">${t.cr} - meta ${t.meta}</div></div>
      <div class="gtrack"><i style="width:${Math.min(t.avance, ESCALA) / ESCALA * 100}%;background:${fill(t.avance)}"></i><span style="left:${marca100}%"></span></div>
      <div class="aav" style="color:${color(t.avance)}">${t.avance}%</div>
      <div class="acnt">${nf(t.nuevas)}/${t.meta}</div>
    </div>`;
}
let ASESORES = [], TIENDAS = [];
let filtro = null, texto = '', sortKey = 'avance', asesorSel = '';

kpisEl.innerHTML = `<div class="kpi"><div class="lbl">Conectando con Sheets...</div></div>`;

loadSheetData()
  .then(({ ASESORES: a, TIENDAS: t }) => { ASESORES = a; TIENDAS = t; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja</div><div class="foot">${err.message}. Verifica que siga compartida como "Cualquiera con el enlace".</div></div>`;
  });

function init() {
  const tot = ASESORES.reduce((s, a) => ({ n: s.n + a.nuevas, m: s.m + a.meta, t: s.t + a.tiendas }), { n: 0, m: 0, t: 0 });
  const avance = tot.n / tot.m * 100;
  kpisEl.innerHTML = `
    <div class="kpi hero">
      <div class="lbl">Cuentas Nuevas - Plaza Oaxaca</div>
      <div class="val">${nf(tot.n)}</div>
      <div class="foot">Meta ${nf(tot.m)} (${(tot.m / tot.t).toFixed(1)} prom./tienda)</div>
      <div class="bar-meta"><i style="width:${Math.min(avance, 100)}%"></i></div>
    </div>
    <div class="kpi"><div class="lbl">Avance Meta</div><div class="val">${avance.toFixed(0)}%</div><div class="foot">${nf(Math.max(tot.m - tot.n, 0))} restantes</div></div>
    <div class="kpi"><div class="lbl">Asesores</div><div class="val">${ASESORES.length}</div><div class="foot">${tot.t} tiendas</div></div>
    <div class="kpi"><div class="lbl">Tiendas >= Meta</div><div class="val">${TIENDAS.filter(t => t.avance >= 100).length}</div><div class="foot">de ${TIENDAS.length} tiendas</div></div>
    <div class="kpi star">
      <div class="lbl">Prom. x Tienda vs Meta</div>
      <div class="val">${(tot.n / tot.t).toFixed(2)}<small class="vs"> / 10.2</small></div>
      <div class="foot">promedio real de cuentas por tienda</div>
      <div class="bar-meta"><i style="width:${Math.min(tot.n / tot.t / 10.2 * 100, 100)}%"></i></div>
    </div>`;

  asesorFilter.innerHTML = '<option value="">Todos los asesores</option>' +
    ASESORES.map(a => `<option value="${a.asesor}">${a.asesor}</option>`).join('');

  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });
  orden.addEventListener('change', () => { sortKey = orden.value; render(); });
  asesorFilter.addEventListener('change', () => {
    asesorSel = asesorFilter.value;
    filtro = null;
    texto = '';
    sortKey = 'avance';
    buscar.value = '';
    setupView();
  });

  setupView();
}

function context() {
  if (asesorSel) {
    const data = TIENDAS.filter(t => t.asesor === asesorSel);
    return {
      mode: 'tienda',
      title: asesorSel,
      data,
      hint: 'Tiendas del asesor seleccionado: <b>Cuentas nuevas</b> / <b>Meta</b>. La marca oscura es el 100% de la meta.',
      distHint: `Reparto de las ${data.length} tiendas de ${asesorSel} por estatus.`,
      placeholder: 'Buscar tienda...',
      sorts: [['avance', 'Avance %'], ['nuevas', 'Cuentas nuevas'], ['nombre', 'Tienda A-Z']],
      name: t => t.tienda,
      sub: t => `${t.cr} - meta ${t.meta}`,
      text: t => `${t.tienda} ${t.cr}`.toLowerCase(),
      topSource: data,
    };
  }
  return {
    mode: 'asesor',
    title: 'General',
    data: ASESORES,
    hint: 'Selecciona un asesor para desplegar sus tiendas con barras de avance. Sin seleccion se muestra el resumen general de tiendas y asesores.',
    distHint: `Reparto de los ${ASESORES.length} asesores por estatus.`,
    placeholder: 'Buscar asesor...',
    sorts: [['avance', 'Avance %'], ['nuevas', 'Cuentas nuevas'], ['tiendas', 'No. de tiendas'], ['nombre', 'Nombre A-Z']],
    name: a => a.asesor,
    sub: a => `${a.tiendas} tiendas - meta ${a.meta}`,
    text: a => a.asesor.toLowerCase(),
    topSource: TIENDAS,
  };
}

function setupView() {
  const ctx = context();
  const titleEl = $('detailTitle');
  if (titleEl) titleEl.textContent = ctx.title;
  hintEl.innerHTML = ctx.hint;
  buscar.placeholder = ctx.placeholder;
  buscar.hidden = !asesorSel;
  orden.hidden = !asesorSel;
  distEl.hidden = !asesorSel;
  orden.innerHTML = ctx.sorts.map(([k, l]) => `<option value="${k}"${k === sortKey ? ' selected' : ''}>Ordenar: ${l}</option>`).join('');
  if (!ctx.sorts.some(([k]) => k === sortKey)) sortKey = ctx.sorts[0][0];

  distEl.classList.remove('filtering');
  distEl.innerHTML = buckets.map(b =>
    `<div class="dchip" data-k="${b.k}" style="--swatch:${b.bg}">${b.lbl}<small>${ctx.data.filter(b.test).length}</small></div>`).join('');
  distEl.querySelectorAll('.dchip').forEach(chip => chip.addEventListener('click', () => {
    filtro = filtro === chip.dataset.k ? null : chip.dataset.k;
    distEl.classList.toggle('filtering', !!filtro);
    distEl.querySelectorAll('.dchip').forEach(c => c.classList.toggle('on', c.dataset.k === filtro));
    render();
  }));

  distHintEl.textContent = ctx.distHint;
  const segs = buckets.map(b => ({ lbl: b.lbl, bg: b.bg, count: ctx.data.filter(b.test).length }));
  distDonutEl.innerHTML = `
    ${multiDonutSVG(segs)}
    <div class="legend">${segs.map(s => `
      <div class="legend-row"><span class="legend-dot" style="background:${s.bg}"></span>${s.lbl}<span class="legend-count" style="color:${s.bg}">${s.count}</span></div>`).join('')}
    </div>`;

  const sortedT = [...ctx.topSource].sort((a, b) => b.avance - a.avance);
  topListEl.innerHTML = sortedT.slice(0, 3).map((t, i) => miniRowHTML(t, i, true)).join('');
  bottomListEl.innerHTML = sortedT.slice(-3).reverse().map((t, i) => miniRowHTML(t, i, false)).join('');

  render();
}

function render() {
  const ctx = context();
  if (!asesorSel) {
    listEl.innerHTML = '';
    emptyEl.hidden = true;
    return;
  }
  const bucket = buckets.find(b => b.k === filtro);
  let arr = ctx.data.filter(d =>
    (!texto || ctx.text(d).includes(texto)) &&
    (!bucket || bucket.test(d))
  );
  arr = [...arr].sort((x, y) => sortKey === 'nombre'
    ? ctx.name(x).localeCompare(ctx.name(y))
    : (y[sortKey] || 0) - (x[sortKey] || 0));

  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((d, i) => {
    const tip = `${ctx.name(d)}\n${ctx.sub(d)}\n${d.avance}% - ${nf(d.nuevas)}/${nf(d.meta)}`.replace(/"/g, '&quot;');
    return `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}" data-tip="${tip}">
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${ctx.name(d)}</div><div class="ainfo">${ctx.sub(d)}</div></div>
      <div class="gtrack"><i style="width:${Math.min(d.avance, ESCALA) / ESCALA * 100}%;background:${fill(d.avance)}"></i><span style="left:${marca100}%"></span></div>
      <div class="aav" style="color:${color(d.avance)}">${d.avance}%</div>
      <div class="acnt">${nf(d.nuevas)}/${d.meta}</div>
    </div>`;
  }).join('');
}