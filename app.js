// Dashboard SPIN BY OXXO · Plaza Oaxaca
// Datos: data.js (ASESORES) y tiendas.js (TIENDAS).
// Avance = Cuentas nuevas ÷ Meta (columnas de la hoja Tiendas). Meta ~10.2/tienda.
'use strict';

const ESCALA = 115; // tope visual de la barra: la meta (100%) queda casi al final
const nf = n => n.toLocaleString('es-MX');
// Color como identificador, no decoración: azul = en meta o cerca, bermellón = alerta, gris = inactivo.
const color = a => a >= 100 ? '#0033A0' : a >= 70 ? '#3A5A9C' : a > 0 ? '#D6331B' : '#6B6B6B';
const fill  = a => a >= 100 ? '#0033A0' : a >= 70 ? '#7C93C4' : a > 0 ? '#D6331B' : '#D8D8D8';

// ---------- KPIs (totales de la plaza, fijos) ----------
const tot = ASESORES.reduce((s, a) => ({ n: s.n + a.nuevas, m: s.m + a.meta, t: s.t + a.tiendas }), { n: 0, m: 0, t: 0 });
const avance = tot.n / tot.m * 100;
document.getElementById('kpis').innerHTML = `
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
const VIEWS = {
  asesor: {
    data: ASESORES,
    hint: 'Columnas de la hoja Tiendas: <b>Cuentas nuevas</b> ÷ <b>Meta</b> = <b>% Cum vs Meta</b> (~10.2 prom./tienda). La marca oscura es el 100% de la meta.',
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

const buckets = [
  { k: 'meta',  lbl: 'Cumplen meta', test: a => a.avance >= 100,                 bg: '#0033A0' },
  { k: 'cerca', lbl: '70–99%',       test: a => a.avance >= 70 && a.avance < 100, bg: '#7C93C4' },
  { k: 'bajo',  lbl: '1–69%',        test: a => a.avance > 0 && a.avance < 70,     bg: '#D6331B' },
  { k: 'cero',  lbl: 'Sin altas',    test: a => a.avance <= 0,                     bg: '#D8D8D8' },
];
const marca100 = 100 / ESCALA * 100;

// ---------- estado ----------
let view = 'asesor', filtro = null, texto = '', sortKey = 'avance', asesorSel = '';

const $ = id => document.getElementById(id);
const distEl = $('dist'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar'), orden = $('orden'), hintEl = $('hint');
const asesorFilter = $('asesorFilter');

// opciones del filtro por asesor (vista tienda)
asesorFilter.innerHTML = '<option value="">Todos los asesores</option>' +
  ASESORES.map(a => `<option value="${a.asesor}">${a.asesor}</option>`).join('');

// ---------- eventos ----------
document.querySelectorAll('.tab').forEach(tb => tb.addEventListener('click', () => {
  if (tb.dataset.view === view) return;
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === tb));
  view = tb.dataset.view; filtro = null; texto = ''; sortKey = 'avance'; asesorSel = '';
  buscar.value = ''; setupView();
}));
buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });
orden.addEventListener('change', () => { sortKey = orden.value; render(); });
asesorFilter.addEventListener('change', () => { asesorSel = asesorFilter.value; render(); });

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
  listEl.innerHTML = arr.map((d, i) => `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}">
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${v.name(d)}</div><div class="ainfo">${v.sub(d)}</div></div>
      <div class="gtrack"><i style="width:${Math.min(d.avance, ESCALA) / ESCALA * 100}%;background:${fill(d.avance)}"></i><span style="left:${marca100}%"></span></div>
      <div class="aav" style="color:${color(d.avance)}">${d.avance}%</div>
      <div class="acnt">${nf(d.nuevas)}/${d.meta}</div>
    </div>`).join('');
}

setupView();
