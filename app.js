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

// Distribución en 6 tramos reales (no solo Cumple/No cumple): el % promedio
// simple esconde que el grueso de las tiendas está entre 1-69%, no en 0.
const buckets = [
  { k: 'cero',  lbl: '0%',      test: a => a.avance <= 0,                       bg: '#9CA3AF' },
  { k: 'b1',    lbl: '1–49%',   test: a => a.avance > 0 && a.avance < 50,       bg: '#D6331B' },
  { k: 'b2',    lbl: '50–69%',  test: a => a.avance >= 50 && a.avance < 70,     bg: '#E8813A' },
  { k: 'b3',    lbl: '70–99%',  test: a => a.avance >= 70 && a.avance < 100,    bg: '#7C93C4' },
  { k: 'b4',    lbl: '100–149%', test: a => a.avance >= 100 && a.avance < 150,  bg: '#0033A0' },
  { k: 'b5',    lbl: '150%+',   test: a => a.avance >= 150,                     bg: '#00C2D1' },
];
const marca100 = 100 / ESCALA * 100;
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), distEl = $('dist'), listEl = $('alist'), emptyEl = $('empty'), generalGaugeEl = $('generalGauge');
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
// Se dibuja "en reposo" (arco en 0, aguja al mínimo) con los valores finales
// guardados en data-*; animateGauge() los aplica un instante después para
// que la transición CSS se vea (si arrancara ya en su posición final, no
// habría nada que animar).
function speedometerHTML(pct, label, foot) {
  const capped = Math.max(0, Math.min(pct, 120));
  const arc = Math.min(capped / 120 * 100, 100);
  const angle = -90 + (capped / 120 * 180);
  const pctText = `${pct.toFixed(0)}%`;
  return `
    <div class="speedometer">
      <svg viewBox="0 0 280 170" role="img" aria-label="${label} ${pctText}">
        <path class="gauge-bg" pathLength="100" d="M 35 135 A 105 105 0 0 1 245 135" />
        <path class="gauge-fill" pathLength="100" data-arc="${arc}" d="M 35 135 A 105 105 0 0 1 245 135" style="stroke-dasharray:0 100" />
        <g class="gauge-ticks">
          <line x1="35" y1="135" x2="48" y2="135" />
          <line x1="140" y1="30" x2="140" y2="43" />
          <line x1="245" y1="135" x2="232" y2="135" />
        </g>
        <text x="35" y="158" class="gauge-scale">0</text>
        <text x="140" y="24" class="gauge-scale mid">60</text>
        <text x="245" y="158" class="gauge-scale end">120</text>
        <line class="gauge-needle" data-angle="${angle}" x1="140" y1="135" x2="140" y2="55" style="transform:rotate(-90deg)" />
        <circle class="gauge-pin" cx="140" cy="135" r="8" />
        <text x="140" y="111" class="gauge-value" data-pct="${pct}">0%</text>
      </svg>
      <div class="speedometer-copy">
        <div class="speedometer-label">${label}</div>
        <div class="speedometer-foot">${foot}</div>
      </div>
    </div>`;
}

// Dispara la animación: arco, aguja y el número contando hasta su valor real.
function animateGauge(root) {
  const fill = root.querySelector('.gauge-fill');
  const needle = root.querySelector('.gauge-needle');
  const valueText = root.querySelector('.gauge-value');
  if (!fill) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.strokeDasharray = `${fill.dataset.arc} 100`;
    needle.style.transform = `rotate(${needle.dataset.angle}deg)`;
    const target = parseFloat(valueText.dataset.pct), start = performance.now(), dur = 1000;
    // El texto del centro no puede usar transition CSS con "%" al final,
    // así que el conteo se hace a mano con requestAnimationFrame.
    function step(now) {
      const t = Math.min((now - start) / dur, 1), eased = 1 - Math.pow(1 - t, 3);
      valueText.textContent = `${Math.round(target * eased)}%`;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }));
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
  const tot = ASESORES.reduce((s, a) => ({
    n: s.n + a.nuevas, m: s.m + a.meta, t: s.t + a.tiendas, r: s.r + a.repos, f: s.f + a.afil7,
  }), { n: 0, m: 0, t: 0, r: 0, f: 0 });
  const avance = tot.n / tot.m * 100; // acumulado ponderado, no promedio de % por tienda (ese lo infla el 34 tiendas con meta chica que llegan a 500%+)
  const cumplen = TIENDAS.filter(t => t.avance >= 100).length;
  kpisEl.innerHTML = `
    <div class="kpi hero">
      <div class="lbl">Cuentas Nuevas — Plaza Oaxaca</div>
      <div class="val">${nf(tot.n)}</div>
      <div class="foot">Meta ${nf(tot.m)} · ${avance.toFixed(1)}% acumulado (ponderado, no promedio simple)</div>
      <div class="bar-meta"><i style="width:${Math.min(avance, 100)}%"></i></div>
    </div>
    <div class="kpi">
      <div class="lbl">Tiendas que cumplen meta</div>
      <div class="val">${cumplen}<small class="vs"> / ${TIENDAS.length}</small></div>
      <div class="foot">${(cumplen / TIENDAS.length * 100).toFixed(0)}% de las tiendas — el acumulado esconde que la mayoría no llega</div>
    </div>
    <div class="kpi">
      <div class="lbl">Reposiciones</div>
      <div class="val">${nf(tot.r)}</div>
      <div class="foot">tarjetas repuestas, no cuentan como cuenta nueva</div>
    </div>
    <div class="kpi">
      <div class="lbl">Afiliaciones 7 días</div>
      <div class="val">${nf(tot.f)}</div>
      <div class="foot">${(tot.f / tot.n * 100).toFixed(0)}% de las cuentas nuevas ya afiliadas en su primera semana</div>
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
    hint: 'Selecciona un asesor para desplegar sus tiendas con barras de avance. Sin seleccion se muestra el avance general.',
    distHint: `Reparto de los ${ASESORES.length} asesores por estatus.`,
    placeholder: 'Buscar asesor...',
    sorts: [['avance', 'Avance %'], ['nuevas', 'Cuentas nuevas'], ['nombre', 'Asesor A-Z']],
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
  orden.innerHTML = ctx.sorts.map(([k, l]) => `<option value="${k}"${k === sortKey ? ' selected' : ''}>Ordenar: ${l}</option>`).join('');
  if (!ctx.sorts.some(([k]) => k === sortKey)) sortKey = ctx.sorts[0][0];

  const isAdvisorView = !!asesorSel;
  buscar.hidden = !isAdvisorView;
  orden.hidden = !isAdvisorView;
  distEl.hidden = !isAdvisorView;
  if (generalGaugeEl) {
    generalGaugeEl.hidden = isAdvisorView;
    if (!isAdvisorView) {
      const total = TIENDAS.reduce((s, t) => ({ n: s.n + t.nuevas, m: s.m + t.meta }), { n: 0, m: 0 });
      const avance = total.m ? total.n / total.m * 100 : 0;
      generalGaugeEl.innerHTML = speedometerHTML(
        avance,
        'Avance general de tiendas',
        `${nf(total.n)} cuentas nuevas de ${nf(total.m)} meta - ${TIENDAS.length} tiendas - ${ASESORES.length} asesores`
      );
      animateGauge(generalGaugeEl);
    }
  }

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