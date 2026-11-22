/* ============================================================
   LuSE Market Renderer — SELF-HEALING
   Rebuilds DOM from scratch, bypasses app.js, watches for wipes.
   ============================================================ */
(function () {
  'use strict';

  const LOG = '[LuSE]';
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat('en-US');
  const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => s == null ? '' : String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
  const fmtPct = p => (p == null || isNaN(p)) ? '—' : `${p > 0 ? '+' : ''}${Number(p).toFixed(2)}%`;
  const fmtPrice = (p, cur = 'ZMW') => (p == null) ? '—' : `${cur} ${nf2.format(p)}`;
  const fmtCompact = (n, cur = '') => {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e9) return `${cur}${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${cur}${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${cur}${(n/1e3).toFixed(1)}K`;
    return `${cur}${nf.format(n)}`;
  };

  let rendering = false;

  function flatten(D) {
    const r = [];
    (D.stocks      || []).forEach(c => r.push({ ...c, board: 'Main',        currency: 'ZMW' }));
    (D.realEstate  || []).forEach(c => r.push({ ...c, board: 'Real Estate', currency: c.currency || 'USD' }));
    (D.quoted      || []).forEach(c => r.push({ ...c, board: 'Quoted',      currency: 'ZMW' }));
    (D.alternative || []).forEach(c => r.push({ ...c, board: 'Alternative', currency: 'ZMW' }));
    return r;
  }

  const PANEL_HTML = `
    <div class="etf-luse-banner">
      <div class="etf-luse-index">
        <span class="etf-luse-index-label">LuSE All Share Index (LASI)</span>
        <div class="etf-luse-index-values">
          <span class="etf-luse-index-value" id="etfLuseIndexValue">—</span>
          <span class="etf-luse-index-change" id="etfLuseIndexChange">—</span>
        </div>
        <span class="etf-luse-index-date" id="etfLuseDate">—</span>
      </div>
      <div class="etf-luse-stats">
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Volume</span><strong class="etf-luse-stat-value" id="etfLuseVolume">—</strong></div>
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Turnover</span><strong class="etf-luse-stat-value" id="etfLuseTurnover">—</strong></div>
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Market Cap</span><strong class="etf-luse-stat-value" id="etfLuseMarketCap">—</strong></div>
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Listed</span><strong class="etf-luse-stat-value" id="etfLuseTotalCompanies">—</strong></div>
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Gainers</span><strong class="etf-luse-stat-value etf-up" id="etfLuseGainers">—</strong></div>
        <div class="etf-luse-stat"><span class="etf-luse-stat-label">Losers</span><strong class="etf-luse-stat-value etf-down" id="etfLuseLosers">—</strong></div>
      </div>
    </div>
    <div class="etf-luse-movers">
      <div class="etf-luse-movers-block">
        <div class="etf-luse-movers-title"><i class="fas fa-arrow-trend-up"></i> Top Gainers</div>
        <div id="etfLuseTopGainers" class="etf-luse-movers-list"></div>
      </div>
      <div class="etf-luse-movers-block">
        <div class="etf-luse-movers-title"><i class="fas fa-arrow-trend-down"></i> Top Losers</div>
        <div id="etfLuseTopLosers" class="etf-luse-movers-list"></div>
      </div>
    </div>
    <div class="etf-companies-list" id="etfLuseGrid"></div>
    <div class="etf-empty" id="etfLuseEmpty"><i class="fas fa-chart-bar"></i><p>Loading LuSE market data…</p></div>
  `;

  function companyCard(c) {
    const day = c.dayPct || 0, ytd = c.ytdPct || 0;
    const dayCls = day > 0 ? 'etf-up' : day < 0 ? 'etf-down' : '';
    const ytdCls = ytd >= 0 ? 'etf-up' : 'etf-down';
    return `
      <div class="etf-company-card" data-symbol="${esc(c.symbol)}" data-board="${esc(c.board)}">
        <div class="etf-company-card-head">
          <div class="etf-company-card-titles">
            <div class="etf-company-symbol">${esc(c.symbol)}</div>
            <div class="etf-company-name">${esc(c.name)}</div>
          </div>
          <span class="etf-company-board">${esc(c.board)}</span>
        </div>
        <div class="etf-company-card-price">
          <span class="etf-company-price">${fmtPrice(c.price, c.currency)}</span>
          <span class="etf-company-change ${dayCls}">${fmtPct(day)}</span>
        </div>
        <div class="etf-company-card-meta">
          <div><span>Volume</span><strong>${c.vol ? nf.format(c.vol) : '—'}</strong></div>
          <div><span>Turnover</span><strong>${c.turnZMW ? fmtCompact(c.turnZMW, 'ZMW ') : '—'}</strong></div>
          <div><span>YTD</span><strong class="${ytdCls}">${fmtPct(ytd)}</strong></div>
          <div><span>P/E</span><strong>${c.pe != null && c.pe !== 0 ? Number(c.pe).toFixed(2) : '—'}</strong></div>
        </div>
        <div class="etf-company-card-actions">
          <button type="button" class="etf-company-buy" data-action="openETFDetail" data-symbol="${esc(c.symbol)}">
            <i class="fas fa-arrow-right"></i> Trade
          </button>
        </div>
      </div>`;
  }

  function render() {
    if (rendering) return;
    rendering = true;
    try {
      const D = window.LUSE_DATA;
      if (!D) { console.error(LOG, '✗ LUSE_DATA missing'); return; }

      const content = document.querySelector('.etf-content');
      if (!content) { console.error(LOG, '✗ .etf-content missing'); return; }

      let panel = $('etf-panel-luse');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'etf-panel-luse';
        panel.className = 'etf-panel';
        panel.dataset.panel = 'luse';
        panel.setAttribute('role', 'tabpanel');
        panel.innerHTML = PANEL_HTML;
        content.appendChild(panel);
        console.log(LOG, '→ Panel injected');
      } else if (!$('etfLuseGrid')) {
        panel.innerHTML = PANEL_HTML;
        console.log(LOG, '→ Panel rebuilt (grid was missing)');
      }

      const s = D.summary || {};
      setText('etfLuseDate', (D.meta && D.meta.date) || '—');
      setText('etfLuseIndexValue', nf2.format(s.lasi || 0));
      const ch = $('etfLuseIndexChange');
      if (ch) {
        ch.textContent = fmtPct(s.lasiChangePct);
        ch.className = 'etf-luse-index-change ' + (s.lasiChangePct >= 0 ? 'etf-up' : 'etf-down');
      }
      setText('etfLuseVolume', nf.format(s.totalVolume || 0));
      setText('etfLuseTurnover', s.totalTurnoverZMW != null ? `ZMW ${nf2.format(s.totalTurnoverZMW)}` : '—');
      setText('etfLuseMarketCap', fmtCompact(s.marketCapUSD, '$'));

      const all = flatten(D);
      setText('etfLuseTotalCompanies', nf.format(all.length));
      setText('etfLuseGainers', all.filter(c => (c.dayPct || 0) > 0).length);
      setText('etfLuseLosers',  all.filter(c => (c.dayPct || 0) < 0).length);
      setText('etfLuseCount', all.length);

      const mv = (arr, cls) => (arr || []).slice(0, 3).map(m => `
        <div class="etf-luse-mover">
          <span class="etf-luse-mover-symbol">${esc(m.symbol)}</span>
          <span class="etf-luse-mover-price">${fmtPrice(m.price, 'ZMW')}</span>
          <span class="etf-luse-mover-change ${cls}">${fmtPct(m.changePct)}</span>
        </div>`).join('');
      const gEl = $('etfLuseTopGainers'); if (gEl) gEl.innerHTML = mv(D.gainers, 'etf-up');
      const lEl = $('etfLuseTopLosers');  if (lEl) lEl.innerHTML = mv(D.losers,  'etf-down');

      const grid = $('etfLuseGrid');
      if (grid) grid.innerHTML = all.map(companyCard).join('');
      const empty = $('etfLuseEmpty'); if (empty) empty.hidden = true;

      console.log(LOG, `✔ Rendered ${all.length} companies`);
    } catch (err) {
      console.error(LOG, '✗ render() error:', err);
    } finally {
      rendering = false;
    }
  }

  function activateLuseTab() {
    document.querySelectorAll('.etf-tab').forEach(t => {
      const on = t.dataset.etfTab === 'luse';
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.etf-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === 'luse');
    });
  }

  function bindCapture() {
    const tabs = document.querySelector('.etf-tabs');
    if (!tabs) { setTimeout(bindCapture, 200); return; }
    if (tabs.dataset.luseBound === '1') return;
    tabs.dataset.luseBound = '1';

    tabs.addEventListener('click', e => {
      const tab = e.target.closest('[data-etf-tab]');
      if (!tab || tab.dataset.etfTab !== 'luse') return;
      e.stopPropagation();
      activateLuseTab();
      if (!$('etfLuseGrid')?.children.length) render();
      console.log(LOG, '→ LuSE tab activated');
    }, true);

    console.log(LOG, '✔ Capture tab handler bound');
  }

  function watch() {
    const content = document.querySelector('.etf-content');
    if (!content) { setTimeout(watch, 300); return; }
    if (content.dataset.luseObs === '1') return;
    content.dataset.luseObs = '1';
    new MutationObserver(() => {
      if (rendering) return;
      if (!$('etfLuseGrid')?.children.length) {
        console.warn(LOG, 'Content wiped — re-render');
        render();
      }
    }).observe(content, { childList: true });
    console.log(LOG, '✔ MutationObserver attached');
  }

  function init() {
    console.log(LOG, '=== init ===');
    if (!window.LUSE_DATA) {
      console.error(LOG, 'FATAL: LUSE_DATA undefined. Check js/luse-market-data.js path.');
      return;
    }
    render();
    bindCapture();
    watch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LuSE = { refresh: render, activate: activateLuseTab };
})();
/* ================================================================
   LuSE MARKET — light theme
   ================================================================ */
.etf-panel { display: none; }
.etf-panel.active { display: block; }
#etf-panel-luse.active { display: block !important; }

.etf-luse-banner {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    gap: 14px;
    padding: 14px 16px;
    margin-bottom: 14px;
    background: linear-gradient(135deg, #e8f5ec, #f0f9f3);
    border: 2px solid #1f7a3d;
    border-radius: 12px;
    color: #1a202c;
}
.etf-luse-index { display:flex; flex-direction:column; gap:4px; padding-right:14px; border-right:1px solid rgba(31,122,61,0.25); }
.etf-luse-index-label { font-size:.72rem; text-transform:uppercase; letter-spacing:.07em; color:#4a5568; font-weight:700; }
.etf-luse-index-values { display:flex; align-items:baseline; gap:10px; }
.etf-luse-index-value { font-size:1.45rem; font-weight:900; color:#1a202c; }
.etf-luse-index-change { font-size:.92rem; font-weight:800; }
.etf-luse-index-change.etf-up   { color:#15803d; }
.etf-luse-index-change.etf-down { color:#dc2626; }
.etf-luse-index-date { font-size:.72rem; color:#4a5568; }
.etf-luse-stats { display:grid; grid-template-columns:repeat(6,minmax(70px,1fr)); gap:8px; align-self:center; }
.etf-luse-stat { display:flex; flex-direction:column; gap:2px; }
.etf-luse-stat-label { font-size:.66rem; text-transform:uppercase; letter-spacing:.06em; color:#4a5568; font-weight:700; }
.etf-luse-stat-value { font-size:.88rem; font-weight:800; color:#1a202c; }
.etf-luse-stat-value.etf-up   { color:#15803d; }
.etf-luse-stat-value.etf-down { color:#dc2626; }

.etf-luse-movers { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.etf-luse-movers-block { background:#fff; border:2px solid var(--color-border); border-radius:10px; padding:10px 14px; }
.etf-luse-movers-title { font-size:.78rem; font-weight:800; color:#1a202c; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
.etf-luse-movers-title i.fa-arrow-trend-up   { color:#15803d; }
.etf-luse-movers-title i.fa-arrow-trend-down { color:#dc2626; }
.etf-luse-movers-list { display:flex; flex-direction:column; gap:6px; }
.etf-luse-mover { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; font-size:.82rem; padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.07); }
.etf-luse-mover:last-child { border-bottom:0; }
.etf-luse-mover-symbol { font-weight:800; color:#1a202c; letter-spacing:.03em; }
.etf-luse-mover-price { color:#4a5568; font-variant-numeric:tabular-nums; font-weight:600; }
.etf-luse-mover-change { font-weight:800; font-variant-numeric:tabular-nums; }
.etf-luse-mover-change.etf-up   { color:#15803d; }
.etf-luse-mover-change.etf-down { color:#dc2626; }

.etf-company-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.etf-company-card-titles { display:flex; flex-direction:column; min-width:0; flex:1; }
.etf-company-board { font-size:.62rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#1f7a3d; background:rgba(31,122,61,0.12); padding:2px 8px; border-radius:4px; flex-shrink:0; align-self:flex-start; white-space:nowrap; }
.etf-company-card-price { display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:8px; border-top:1px solid rgba(0,0,0,0.07); }
.etf-company-card-meta { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding-top:6px; }
.etf-company-card-meta > div { display:flex; flex-direction:column; gap:1px; min-width:0; }
.etf-company-card-meta > div > span { font-size:.56rem; text-transform:uppercase; letter-spacing:.04em; color:#6b7280; font-weight:700; }
.etf-company-card-meta > div > strong { font-size:.72rem; font-weight:800; color:#1a202c; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.etf-company-card-meta .etf-up   { color:#15803d; }
.etf-company-card-meta .etf-down { color:#dc2626; }
.etf-company-card-actions { display:flex; gap:6px; margin-top:4px; }
.etf-company-buy { flex:1; padding:7px 10px; border-radius:6px; background:#1f7a3d; color:#fff; border:2px solid #155a2c; font-family:inherit; font-weight:800; font-size:.7rem; cursor:pointer; transition:all .2s ease; min-height:32px; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.etf-company-buy:hover { background:#22c55e; transform:translateY(-1px); }
.etf-company-change.etf-up   { background:rgba(34,197,94,0.15); color:#15803d; }
.etf-company-change.etf-down { background:rgba(239,68,68,0.15); color:#dc2626; }

@media (max-width:900px) {
    .etf-luse-banner { grid-template-columns:1fr; }
    .etf-luse-index { border-right:0; border-bottom:1px solid rgba(31,122,61,0.25); padding-right:0; padding-bottom:10px; }
    .etf-luse-stats { grid-template-columns:repeat(3,1fr); }
    .etf-company-card-meta { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:640px) {
    .etf-luse-movers { grid-template-columns:1fr; }
    .etf-luse-stats  { grid-template-columns:repeat(2,1fr); }
    .etf-luse-index-value { font-size:1.2rem; }
}