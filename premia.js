// Dashboard SPIN BY OXXO · Avance Spin Premia · Plaza Oaxaca
// Datos en vivo desde premia-sheet.js. Gráficos: SVG a mano, sin librerías.
'use strict';

const nf = n => n.toLocaleString('es-MX');
const AZUL = '#0033A0', AZUL_CLARO = '#B9CDF0';

// ---------- donut (gauge circular) ----------
// pct: valor real (puede pasar de 100). El anillo se limita visualmente a 100%;
// el número en el centro siempre muestra el valor real.
function donutSVG(pctReal, size = 108) {
  const r = 42, c = 2 * Math.PI * r, capped = Math.max(0, Math.min(pctReal, 100));
  const offset = c * (1 - capped / 100);
  const cx = size / 2, cy = size / 2;
  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(10,10,10,.08)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${AZUL}" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
      font-weight="700" font-size="22" fill="#0A0A0A">${pctReal.toFixed(0)}%</text>
  </svg>`;
}

// ---------- ranking horizontal (barra por asesor) ----------
function barChartSVG(items, { value, max, suffix = '%' }) {
  const labelW = 168, chartW = 360, rowH = 30, padTop = 6;
  const w = labelW + chartW + 60, h = items.length * rowH + padTop * 2;
  const metaX = max > 100 ? labelW + (100 / max) * chartW : null;
  const bars = items.map((it, i) => {
    const y = padTop + i * rowH, cy = y + rowH / 2 - 6;
    const val = value(it), bw = Math.max(2, (Math.min(val, max) / max) * chartW);
    const nombre = it.asesor.length > 22 ? it.asesor.slice(0, 21) + '…' : it.asesor;
    return `
      <text x="${labelW - 10}" y="${cy + 9}" text-anchor="end" font-family="Helvetica,Arial,sans-serif"
        font-size="12" font-weight="700" fill="#0A0A0A">${nombre}</text>
      <rect x="${labelW}" y="${cy}" width="${bw}" height="14" rx="7" fill="${i < 3 ? AZUL : AZUL_CLARO}"/>
      <text x="${labelW + bw + 8}" y="${cy + 11}" font-family="Helvetica,Arial,sans-serif"
        font-size="12" font-weight="700" fill="${AZUL}">${val.toFixed(1)}${suffix}</text>`;
  }).join('');
  const metaLine = metaX ? `<line x1="${metaX}" y1="${padTop - 2}" x2="${metaX}" y2="${h - padTop + 2}"
      stroke="#0A0A0A" stroke-width="1.5" opacity=".5"/>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${bars}${metaLine}</svg>`;
}

let ASESORES = [], TIENDAS = [];
const $ = id => document.getElementById(id);
const kpisEl = $('kpis'), chartEl = $('chart'), listEl = $('alist'), emptyEl = $('empty');
const buscar = $('buscar');

kpisEl.innerHTML = `<div class="kpi"><div class="lbl">Conectando con Sheets…</div></div>`;

loadPremiaData()
  .then(({ ASESORES: a, TIENDAS: t }) => { ASESORES = a; TIENDAS = t; init(); })
  .catch(err => {
    kpisEl.innerHTML = `<div class="kpi"><div class="lbl">No se pudo leer la hoja</div><div class="foot">${err.message}. Verifica que siga compartida como "Cualquiera con el enlace".</div></div>`;
  });

const METRICAS = {
  trafico: { key: 'avanceTrafico', max: 150, suffix: '%' },
  servicios: { key: 'pctServicios', max: 60, suffix: '%' },
  afiliaciones: { key: 'conversion', max: 100, suffix: '%' },
};
let metrica = 'trafico', texto = '';

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
  buscar.addEventListener('input', () => { texto = buscar.value.trim().toLowerCase(); render(); });

  render();
}

function render() {
  const m = METRICAS[metrica];
  const ranked = [...ASESORES].sort((a, b) => b[m.key] - a[m.key]);

  chartEl.innerHTML = barChartSVG(ranked, { value: a => a[m.key], max: m.max, suffix: m.suffix });

  let arr = TIENDAS.filter(t => !texto ||
    `${t.tienda} ${t.asesor} ${t.cr}`.toLowerCase().includes(texto));
  arr = [...arr].sort((a, b) => b[m.key] - a[m.key]);

  emptyEl.hidden = arr.length > 0;
  listEl.innerHTML = arr.map((t, i) => `
    <div class="arow${i < 3 ? ' top' + (i + 1) : ''}">
      <div class="rkn">${i + 1}</div>
      <div><div class="anm">${t.tienda}</div><div class="ainfo">${t.cr} · ${t.asesor}</div></div>
      <div class="gtrack"><i style="width:${Math.min(t[m.key], m.max) / m.max * 100}%;background:${AZUL}"></i>
        ${m.key === 'avanceTrafico' ? `<span style="left:${100 / m.max * 100}%"></span>` : ''}</div>
      <div class="aav" style="color:${AZUL}">${t[m.key].toFixed(1)}%</div>
      <div class="acnt">${m.key === 'avanceTrafico' ? t.pctTrafico + '% / ' + t.metaTrafico + '%'
                        : m.key === 'conversion' ? t.afiliaciones + '/' + t.registros : ''}</div>
    </div>`).join('');
}
