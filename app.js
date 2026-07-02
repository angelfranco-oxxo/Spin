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

// ---------- tooltip flotante para cualquier elemento con [data-tip] ----------
const chartTip = $('chartTip');
function bindTooltips(root) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mouseenter', e => { chartTip.textContent = el.dataset.tip; chartTip.hidden = false; moveTip(e); });
    el.addEventListener('mousemove', moveTip);
    el.addEventListener('mouseleave', () => { chartTip.hidden = true; });
  });
}
function moveTip(e) { chartTip.style.left = e.clientX + 'px'; chartTip.style.top = e.clientY + 'px'; }

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

let ASESORES = [], TIENDAS = [], VIEWS = {};
let view = 'asesor', filtro = null, texto = '', sortKey = 'avance', asesorSel = '';

kpisEl.innerHTML = `<div class="kpi"><div class="lbl">Conectando con Sheets…</div></div>`;

loadSheetData()
  .then(({ ASESORES: a, TIENDAS: t }) => { ASESORES = a; TIENDAS = t; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja</div><div class="foot">${err.message}. Verifica que siga compartida como "Cualquiera con el enlace".</div></div>`;
  });

function init() {
  // ---------- KPIs (totales de la plaza, fijos) ----------
  const tot = ASESORES.reduce((s, a) => ({ n: s.n + a.nuevas, m: s.m + a.meta, t: s.t + a.tiendas }), { n: 0, m: 0, t: 0 });
  const avance = tot.n / tot.m * 100;
  kpisEl.innerHTML = `
    <div class="kpi hero">
      <div class="lbl">Cuentas Nuevas — Plaza Oaxaca</div>
      <div class="val">${nf(tot.n)}</div>
      <div class="foot">Meta ${nf(tot.m)} (${(tot.m / tot.t).toFixed(1)} prom./tienda)</div>
      <div class="bar-meta"><i style="width:${Math.min(avance, 100)}%"></i></div>
    </div>
    <div class="kpi"><div class="lbl">Avance Meta</div><div class="val">${avance.toFixed(0)}%</div><div class="foot">${nf(Math.max(tot.m - tot.n, 0))} restantes</div></div>
    <div class="kpi"><div class="lbl">Asesores</div><div class="val">${ASESORES.length}</div><div class="foot">${tot.t} tiendas</div></div>
    <div class="kpi"><div class="lbl">Tiendas ≥ Meta</div><div class="val">${TIENDAS.filter(t => t.avance >= 100).length}</div><div class="foot">de ${TIENDAS.length} tiendas</div></div>
    <div class="kpi star">
      <div class="lbl">Prom. x Tienda vs Meta</div>
      <div class="val">${(tot.n / tot.t).toFixed(2)}<small class="vs"> / 10.2</small></div>
      <div class="foot">promedio real de cuentas por tienda</div>
      <div class="bar-meta"><i style="width:${Math.min(tot.n / tot.t / 10.2 * 100, 100)}%"></i></div>
    </div>`;

  // ---------- configuración por vista ----------
  VIEWS = {
    asesor: {
      data: ASESORES,
      hint: 'Datos en vivo de la hoja Tiendas: <b>Cuentas nuevas</b> ÷ <b>Meta</b> = <b>% Cum vs Meta</b> (~10.2 prom./tienda). La marca oscura es el 100% de la meta.',
      placeholder: 'Buscar asesor…',
      sorts: [['avance', 'Avance %'], ['nuevas', 'Cuentas nuevas'], ['tiendas', 'Nº de tiendas'], ['nombre', 'Nombre A–Z']],
      name: a => a.asesor,
      sub: a => `${a.tiendas} tiendas · meta ${a.meta}`,
      text: t => t.toLowerCase(),
      useAsesorFilter: false,
    },
    tienda: {
      data: TIENDAS,
      hint: 'Avance de cada <b>tienda</b>: Cuentas nuevas ÷ Meta. Usa el filtro para ver solo las tiendas de un asesor. La marca oscura es el 100% de la meta.',
      placeholder: 'Buscar tienda…',
      sorts: [['avance', 'Avance %'], ['nuevas', 'Cuentas nuevas'], ['nombre', 'Tienda A–Z']],
      name: t => t.tienda,
      sub: t => `${t.cr} · ${t.asesor} · meta ${t.meta}`,
      text: t => `${t.tienda} ${t.asesor} ${t.cr}`.toLowerCase(),
      useAsesorFilter: true,
    },
  };

  asesorFilter.innerHTML = '<option value="">Todos los asesores</option>' +
    ASESORES.map(a => `<option value="${a.asesor}">${a.asesor}</option>`).join('');

  document.querySelectorAll('.tab').forEach(tb => tb.addEventListener('click', () => {
    if (tb.dataset.view === view) return;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === tb));
    view = tb.dataset.view; filtro = null; texto = ''; sortKey = 'avance'; asesorSel = '';
    buscar.value = ''; setupView();
  }));
  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });
  orden.addEventListener('change', () => { sortKey = orden.value; render(); });
  asesorFilter.addEventListener('change', () => { asesorSel = asesorFilter.value; render(); });

  setupView();
}

function setupView() {
  const v = VIEWS[view];
  hintEl.innerHTML = v.hint;
  buscar.placeholder = v.placeholder;
  orden.innerHTML = v.sorts.map(([k, l], i) => `<option value="${k}"${i ? '' : ' selected'}>Ordenar: ${l}</option>`).join('');
  asesorFilter.hidden = !v.useAsesorFilter;
  asesorFilter.value = '';
  distEl.classList.remove('filtering');
  distEl.innerHTML = buckets.map(b =>
    `<div class="dchip" data-k="${b.k}" style="--swatch:${b.bg}">${b.lbl}<small>${v.data.filter(b.test).length}</small></div>`).join('');
  distEl.querySelectorAll('.dchip').forEach(chip => chip.addEventListener('click', () => {
    filtro = filtro === chip.dataset.k ? null : chip.dataset.k;
    distEl.classList.toggle('filtering', !!filtro);
    distEl.querySelectorAll('.dchip').forEach(c => c.classList.toggle('on', c.dataset.k === filtro));
    render();
  }));

  // Dona de distribución: mismos buckets de los chips, de la vista activa.
  distHintEl.textContent = view === 'asesor' ? 'Reparto de los 11 asesores por estatus.' : 'Reparto de las 254 tiendas por estatus.';
  const segs = buckets.map(b => ({ lbl: b.lbl, bg: b.bg, count: v.data.filter(b.test).length }));
  distDonutEl.innerHTML = `
    ${multiDonutSVG(segs)}
    <div class="legend">${segs.map(s => `
      <div class="legend-row"><span class="legend-dot" style="background:${s.bg}"></span>${s.lbl}<span class="legend-count" style="color:${s.bg}">${s.count}</span></div>`).join('')}
    </div>`;
  bindTooltips(distDonutEl);

  // Top / A reforzar: siempre por tienda (dato accionable concreto), sin importar la vista activa.
  const sortedT = [...TIENDAS].sort((a, b) => b.avance - a.avance);
  topListEl.innerHTML = sortedT.slice(0, 3).map((t, i) => miniRowHTML(t, i, true)).join('');
  bottomListEl.innerHTML = sortedT.slice(-3).reverse().map((t, i) => miniRowHTML(t, i, false)).join('');

  render();
}

function render() {
  const v = VIEWS[view];
  const bucket = buckets.find(b => b.k === filtro);
  let arr = v.data.filter(d =>
    (!texto || v.text(d).includes(texto)) &&
    (!bucket || bucket.test(d)) &&
    (!asesorSel || d.asesor === asesorSel)
  );
  arr = [...arr].sort((x, y) => sortKey === 'nombre'
    ? v.name(x).localeCompare(v.name(y))
    : (y[sortKey] || 0) - (x[sortKey] || 0));

  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((d, i) => {
    const tip = `${v.name(d)}\n${v.sub(d)}\n${d.avance}% · ${nf(d.nuevas)}/${nf(d.meta)}`.replace(/"/g, '&quot;');
    return `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}" data-tip="${tip}">
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${v.name(d)}</div><div class="ainfo">${v.sub(d)}</div></div>
      <div class="gtrack"><i style="width:${Math.min(d.avance, ESCALA) / ESCALA * 100}%;background:${fill(d.avance)}"></i><span style="left:${marca100}%"></span></div>
      <div class="aav" style="color:${color(d.avance)}">${d.avance}%</div>
      <div class="acnt">${nf(d.nuevas)}/${d.meta}</div>
    </div>`;
  }).join('');
  bindTooltips(listEl);
}
